-- Phase 6: buying credit packs with Razorpay.
--
-- Flow: the server creates a Razorpay order and a `payments` row (status 'created') with the service
-- role. The dealer pays in Razorpay Checkout. Razorpay then calls our webhook, which verifies the
-- signature and calls apply_razorpay_payment. Credits are only ever added here, never from the browser.

alter table public.payments
  add column pack_key text,
  add column paid_at timestamptz,
  add column failure_reason text;

-- Credit history on the profile page lists paid packs newest first.
create index payments_dealer_id_created_at_idx on public.payments (dealer_id, created_at desc);

-- Marks an order paid and adds its credits, once. Safe to call any number of times for the same
-- payment: Razorpay retries webhooks and sends both payment.captured and order.paid for one payment.
--
-- Returns {status: 'credited' | 'duplicate' | 'order_already_paid', dealer_id, credits_added, credits}.
-- Raises 'order_not_found' (not one of ours) or 'amount_mismatch' (paid amount differs from the order).
create function public.apply_razorpay_payment(p_order_id text, p_payment_id text, p_amount_paise int)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_payment public.payments%rowtype;
  v_credits int;
begin
  -- Lock the order row first, so two deliveries of the same payment run one after the other.
  -- Lock order everywhere: this row, then the dealer (publish_report: car, then dealer).
  select * into v_payment from public.payments where razorpay_order_id = p_order_id for update;
  if not found then
    raise exception 'order_not_found';
  end if;

  if v_payment.status = 'paid' then
    if v_payment.razorpay_payment_id = p_payment_id then
      return jsonb_build_object('status', 'duplicate', 'dealer_id', v_payment.dealer_id);
    end if;
    -- Razorpay allows one successful payment per order, so this shouldn't happen. Never credit twice.
    return jsonb_build_object('status', 'order_already_paid', 'dealer_id', v_payment.dealer_id);
  end if;

  if p_amount_paise <> v_payment.amount_paise then
    raise exception 'amount_mismatch';
  end if;

  -- A failed attempt on the same order can be followed by a successful retry, so 'failed' -> 'paid' is fine.
  update public.payments
     set status = 'paid', razorpay_payment_id = p_payment_id, paid_at = now(), failure_reason = null
   where id = v_payment.id;

  update public.dealers set credits = credits + v_payment.credits
   where id = v_payment.dealer_id
   returning credits into v_credits;

  return jsonb_build_object(
    'status', 'credited',
    'dealer_id', v_payment.dealer_id,
    'credits_added', v_payment.credits,
    'credits', v_credits
  );
end $$;
revoke execute on function public.apply_razorpay_payment(text, text, int) from public, anon, authenticated;
grant execute on function public.apply_razorpay_payment(text, text, int) to service_role;

-- Dealers already have read-only access to their own payments (payments_select_own) and no write
-- access. Orders are created and updated by the server with the service role.
