"use client";

import { useEffect, useRef, useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { TagIcon } from "@/components/icons";
import { Button, Card, Field, FieldMessage, FormError, Label, LinkButton, Segmented, StickyBar, TextAreaField, buttonClass, focusFirstError, useToast } from "@/components/ui";
import { clearDraft, useFormDraft } from "@/lib/draft";
import { LOGO, STORAGE_BUCKETS } from "@/lib/config";
import { compressImage } from "@/lib/images/compress";
import { useT } from "@/components/i18n-provider";
import type { Strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/client";
import type { UserType } from "@/lib/supabase/database.types";
import { USER_TYPES } from "@/lib/user-type";
import { errorText } from "@/lib/i18n";
import { onboardingSchema, type OnboardingField } from "@/lib/validation/profile";
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
  // Mirrors of two fields, for the report header preview.
  const [businessName, setBusinessName] = useState(initial.business_name);
  const [city, setCity] = useState(initial.city);
  // Path already uploaded in this session, so a retry after a validation error doesn't upload again.
  const uploadedPath = useRef<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const toast = useToast();
  const draftKey = `profile:${profileId}`;
  useFormDraft(draftKey, formRef, () => {
    const form = formRef.current;
    if (form) {
      setBusinessName(String(new FormData(form).get("business_name") ?? ""));
      setCity(String(new FormData(form).get("city") ?? ""));
    }
    toast.show({ tone: "info", message: t.common.draftRestored });
  });

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
    const form = e.currentTarget;
    const formData = new FormData(form);

    // Check the fields here first, so a missing name shows at once instead of after a round trip.
    const check = onboardingSchema(profileId).safeParse({
      user_type: userType ?? "",
      owner_name: formData.get("owner_name") ?? "",
      city: formData.get("city") ?? "",
      business_name: isDealer ? (formData.get("business_name") ?? "") : "",
      address: isDealer ? (formData.get("address") ?? "") : "",
      logo_path: "",
    });
    if (!check.success) {
      const fieldErrors: OnboardingState["fieldErrors"] = {};
      for (const issue of check.error.issues) fieldErrors[issue.path[0] as OnboardingField] ??= errorText(t, issue.message);
      setState({ fieldErrors });
      focusFirstError(form);
      return;
    }

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
      try {
        // On success the action redirects, so a returned value means there's something to show.
        const result = await saveProfile(formData);
        setState(result);
        if (!result.formError && !result.fieldErrors) clearDraft(draftKey);
      } catch {
        setState({ formError: navigator.onLine ? t.common.somethingWrong : t.common.offline });
      }
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
      ref={formRef}
      onSubmit={onSubmit}
      onInput={(e) => clearFieldError((e.target as HTMLInputElement).name)}
      className="flex flex-1 flex-col gap-6"
      noValidate
    >
      <Card className="flex flex-col gap-6">
        <div>
          <p className="mb-2 text-small font-medium">{t.onboarding.userType}</p>
          <Segmented
            label={t.onboarding.userType}
            options={userTypeOptions(t)}
            value={userType}
            columns="grid-cols-1 min-[380px]:grid-cols-3"
            onChange={(value) => {
              setUserType(value);
              clearFieldError("user_type");
            }}
          />
          <FieldMessage error={errors.user_type} hint={userType ? t.onboarding.userTypeHints[userType] : t.onboarding.userTypeChoose} />
        </div>
        <Field
          label={t.onboarding.ownerName}
          name="owner_name"
          autoComplete="name"
          autoCapitalize="words"
          enterKeyHint="next"
          defaultValue={initial.owner_name}
          error={errors.owner_name}
          autoFocus={!initial.owner_name}
          required
        />
        <Field
          label={t.onboarding.city}
          name="city"
          autoComplete="address-level2"
          autoCapitalize="words"
          enterKeyHint="done"
          defaultValue={initial.city}
          onChange={(e) => setCity(e.target.value)}
          error={errors.city}
          required
        />
      </Card>

      {/* Hidden rather than removed, so switching type and back keeps what was typed. */}
      <section hidden={!isDealer} aria-labelledby="dealer-details" className="flex flex-col gap-6 rounded-card bg-surface p-4 shadow-card sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 id="dealer-details" className="text-heading">
            {t.onboarding.dealerDetails}
          </h2>
          <p className="text-small text-ink-muted">{t.onboarding.dealerDetailsHint}</p>
        </div>
        <Field
          label={t.onboarding.businessName}
          name="business_name"
          autoComplete="organization"
          defaultValue={initial.business_name}
          onChange={(e) => setBusinessName(e.target.value)}
          error={errors.business_name}
        />
        <TextAreaField label={t.onboarding.address} name="address" rows={3} autoComplete="street-address" defaultValue={initial.address} error={errors.address} />

        <div>
          <Label htmlFor="logo_file">{t.onboarding.logo}</Label>
          <div className="flex items-center gap-4">
            <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-control bg-canvas ring-1 ring-line">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element -- blob: previews can't go through next/image
                <img src={preview} alt="" className="size-full animate-fade-in object-contain" />
              ) : (
                <TagIcon size={28} className="text-ink-subtle" />
              )}
            </div>
            <div className="flex flex-col items-start gap-1">
              <label className={`${buttonClass("secondary", "cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-brand-700", false, "sm")}`}>
                {preview ? t.onboarding.changeLogo : t.onboarding.chooseLogo}
                <input ref={fileInput} id="logo_file" type="file" name="logo_file" accept={LOGO.mimeTypes.join(",")} onChange={onLogoChange} className="sr-only" />
              </label>
              {preview && (
                <button type="button" onClick={removeLogo} className="min-h-11 rounded-chip px-2 text-small font-medium text-ink-muted transition-colors hover:bg-sunken">
                  {t.onboarding.removeLogo}
                </button>
              )}
            </div>
          </div>
          <FieldMessage error={logoError ?? errors.logo_path} hint={t.onboarding.logoHint} />
        </div>

        <ReportHeaderPreview logo={preview} name={businessName || t.onboarding.businessName} city={city} />
      </section>

      <FormError message={state.formError} />
      <StickyBar className={cancelHref ? "!flex-row" : ""}>
        {cancelHref && (
          <LinkButton href={cancelHref} variant="secondary" onClick={() => clearDraft(draftKey)} className="flex-1">
            {t.common.back}
          </LinkButton>
        )}
        <Button type="submit" loading={busy} className={cancelHref ? "flex-[2]" : ""}>
          {uploading ? t.onboarding.uploading : t.onboarding.submit}
        </Button>
      </StickyBar>
    </form>
  );
}

/** How the dealership name and logo will look at the top of a shared report. */
function ReportHeaderPreview({ logo, name, city }: { logo: string | null; name: string; city: string }) {
  const t = useT();
  return (
    <div>
      <p className="mb-2 text-small font-medium">{t.onboarding.previewTitle}</p>
      <div className="flex items-center gap-4 rounded-control bg-canvas p-4">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- blob: preview
          <img src={logo} alt="" className="size-12 shrink-0 rounded-control bg-surface object-contain ring-1 ring-line" />
        ) : (
          <span className="flex size-12 shrink-0 items-center justify-center rounded-control bg-brand-700 font-semibold text-white">{name.trim().charAt(0).toUpperCase() || "?"}</span>
        )}
        <div className="min-w-0">
          <p className="font-semibold break-words">{name}</p>
          {city && <p className="text-small text-ink-muted">{city}</p>}
        </div>
      </div>
    </div>
  );
}
