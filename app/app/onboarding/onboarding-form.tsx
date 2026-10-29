"use client";

import { useEffect, useRef, useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { Button, LinkButton } from "@/components/button";
import { Field, FormError, inputClass } from "@/components/field";
import { Segmented } from "@/components/segmented";
import { LOGO, STORAGE_BUCKETS } from "@/lib/config";
import { compressImage } from "@/lib/images/compress";
import { useT } from "@/components/i18n-provider";
import type { Strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/client";
import type { UserType } from "@/lib/supabase/database.types";
import { USER_TYPES } from "@/lib/user-type";
import { saveProfile, type OnboardingState } from "./actions";

const userTypeOptions = (t: Strings) => USER_TYPES.map((value) => ({ value, label: t.onboarding.userTypes[value] }));

type Initial = {
  user_type: UserType | null;
  owner_name: string;
  business_name: string;
  city: string;
  address: string;
  logo_path: string | null;
  logo_url: string | null;
};

export function OnboardingForm({ profileId, initial, cancelHref }: { profileId: string; initial: Initial; cancelHref?: string }) {
  const t = useT();
  const [state, setState] = useState<OnboardingState>({});
  const [userType, setUserType] = useState<UserType | null>(initial.user_type);
  const isDealer = userType === "dealer";
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(initial.logo_url);
  // Path already uploaded in this session, so a retry after a validation error doesn't upload again.
  const uploadedPath = useRef<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const objectUrl = useRef<string | null>(null);

  function setLocalPreview(file: File | null) {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = file ? URL.createObjectURL(file) : null;
    setPreview(objectUrl.current);
  }

  useEffect(() => () => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
  }, []);

  function onLogoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setLogoError(null);
    if (!file) return;
    if (!(LOGO.mimeTypes as readonly string[]).includes(file.type)) {
      setLogoError(t.onboarding.errors.logoType);
      return;
    }
    if (file.size > LOGO.maxBytes * 5) {
      // Generous pre-compression cap; the compressed result must still fit the bucket limit.
      setLogoError(t.onboarding.errors.logoSize);
      return;
    }
    uploadedPath.current = null;
    setLogoRemoved(false);
    setLogoFile(file);
    setLocalPreview(file);
  }

  function removeLogo() {
    setLogoFile(null);
    setLogoRemoved(true);
    setLocalPreview(null);
    uploadedPath.current = null;
    if (fileInput.current) fileInput.current.value = "";
  }

  async function uploadLogo(file: File): Promise<string | null> {
    // Keep PNG for transparency; everything else becomes JPEG.
    const isPng = file.type === "image/png";
    const blob = await compressImage(file, {
      maxEdgePx: LOGO.maxEdgePx,
      type: isPng ? "image/png" : "image/jpeg",
      quality: 0.85,
    });
    if (blob.size > LOGO.maxBytes) {
      setLogoError(t.onboarding.errors.logoSize);
      return null;
    }
    const path = `${profileId}/logo-${Date.now()}.${isPng ? "png" : "jpg"}`;
    const { error } = await createClient()
      .storage.from(STORAGE_BUCKETS.logos)
      .upload(path, blob, { contentType: blob.type, cacheControl: "31536000", upsert: false });
    if (error) {
      setLogoError(t.onboarding.errors.logoUpload);
      return null;
    }
    return path;
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.delete("logo_file");
    formData.set("user_type", userType ?? "");
    if (!isDealer) for (const name of ["business_name", "address"]) formData.delete(name);

    // Only dealers have a logo; the server clears it for everyone else.
    let logoPath = logoRemoved || !isDealer ? null : initial.logo_path;
    if (isDealer && logoFile) {
      if (!uploadedPath.current) {
        setUploading(true);
        try {
          uploadedPath.current = await uploadLogo(logoFile);
        } catch {
          setLogoError(t.onboarding.errors.logoUpload);
        } finally {
          setUploading(false);
        }
      }
      if (!uploadedPath.current) return;
      logoPath = uploadedPath.current;
    }
    formData.set("logo_path", logoPath ?? "");

    startTransition(async () => {
      // On success the action redirects, so a returned value means there's something to show.
      const result = await saveProfile(formData);
      setState(result);
    });
  }

  // Clear a field's error as soon as the user edits it.
  function clearFieldError(name: string) {
    if (!state.fieldErrors?.[name as keyof typeof errors]) return;
    setState((s) => ({ ...s, fieldErrors: { ...s.fieldErrors, [name]: undefined } }));
  }

  const busy = uploading || isPending;
  const errors = state.fieldErrors ?? {};

  return (
    <form
      onSubmit={onSubmit}
      onInput={(e) => clearFieldError((e.target as HTMLInputElement).name)}
      className="mt-6 flex flex-col gap-5"
      noValidate
    >
      <div>
        <p className="mb-1.5 block text-sm font-medium text-slate-700">{t.onboarding.userType}</p>
        <Segmented
          label={t.onboarding.userType}
          options={userTypeOptions(t)}
          value={userType}
          onChange={(value) => {
            setUserType(value);
            clearFieldError("user_type");
          }}
        />
        {errors.user_type && <p className="mt-1.5 text-sm text-red-600">{errors.user_type}</p>}
      </div>
      <Field label={t.onboarding.ownerName} name="owner_name" autoComplete="name" defaultValue={initial.owner_name} error={errors.owner_name} required />
      <Field label={t.onboarding.city} name="city" autoComplete="address-level2" defaultValue={initial.city} error={errors.city} required />

      {/* Hidden rather than removed, so switching type and back keeps what was typed. */}
      <section hidden={!isDealer} aria-labelledby="dealer-details" className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-4">
        <div>
          <h2 id="dealer-details" className="font-semibold">
            {t.onboarding.dealerDetails}
          </h2>
          <p className="text-sm text-slate-500">{t.onboarding.dealerDetailsHint}</p>
        </div>
        <Field
          label={t.onboarding.businessName}
          name="business_name"
          autoComplete="organization"
          defaultValue={initial.business_name}
          error={errors.business_name}
        />
        <div>
          <label htmlFor="address" className="mb-1.5 block text-sm font-medium text-slate-700">
            {t.onboarding.address}
          </label>
          <textarea
            id="address"
            name="address"
            rows={3}
            autoComplete="street-address"
            defaultValue={initial.address}
            aria-invalid={Boolean(errors.address)}
            className={`${inputClass} py-3`}
          />
          {errors.address && <p className="mt-1.5 text-sm text-red-600">{errors.address}</p>}
        </div>

        <div>
          <p className="mb-1.5 block text-sm font-medium text-slate-700">{t.onboarding.logo}</p>
          <div className="flex items-center gap-4">
            <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-300 bg-white">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element -- blob: previews can't go through next/image
                <img src={preview} alt="" className="size-full object-contain" />
              ) : (
                <span className="text-2xl text-slate-300">🏷️</span>
              )}
            </div>
            <div className="flex flex-col items-start gap-1">
              <label className="inline-flex min-h-12 cursor-pointer items-center rounded-xl border border-slate-300 bg-white px-4 font-semibold active:bg-slate-100">
                {preview ? t.onboarding.changeLogo : t.onboarding.chooseLogo}
                <input ref={fileInput} type="file" name="logo_file" accept={LOGO.mimeTypes.join(",")} onChange={onLogoChange} className="sr-only" />
              </label>
              {preview && (
                <button type="button" onClick={removeLogo} className="min-h-11 px-1 text-sm font-medium text-slate-500">
                  {t.onboarding.removeLogo}
                </button>
              )}
            </div>
          </div>
          <p className={`mt-1.5 text-sm ${logoError || errors.logo_path ? "text-red-600" : "text-slate-500"}`}>
            {logoError ?? errors.logo_path ?? t.onboarding.logoHint}
          </p>
        </div>
      </section>

      <FormError message={state.formError} />
      <Button type="submit" loading={busy}>
        {uploading ? t.onboarding.uploading : t.onboarding.submit}
      </Button>
      {cancelHref && (
        <LinkButton href={cancelHref} variant="secondary">
          {t.common.back}
        </LinkButton>
      )}
    </form>
  );
}
