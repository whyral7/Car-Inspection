// All user-facing copy lives here so a Hindi version can be added later
// (e.g. export a `hi` object with the same shape and pick by locale).

export const en = {
  appName: "CarParakh",
  tagline: "Trusted inspection reports for used cars, ready to share on WhatsApp.",
  disclaimer: "Visual and documented inspection. Not a mechanical certification.",

  common: {
    loading: "Please wait…",
    save: "Save",
    logout: "Log out",
    back: "Back",
    somethingWrong: "Something went wrong. Please try again.",
    offline: "You seem to be offline. Check your internet and try again.",
  },

  home: {
    login: "Log in with phone",
  },

  login: {
    title: "Log in",
    subtitle: "We'll send a 6-digit code to your mobile number.",
    phoneLabel: "Mobile number",
    phonePlaceholder: "98765 43210",
    sendOtp: "Send OTP",
    otpTitle: "Enter OTP",
    otpSentTo: (phone: string) => `We sent a code to ${phone}`,
    otpLabel: "6-digit code",
    verify: "Verify and continue",
    resend: "Resend OTP",
    resendIn: (seconds: number) => `Resend OTP in ${seconds}s`,
    changeNumber: "Change number",
    errors: {
      invalidPhone: "Enter a valid 10-digit Indian mobile number.",
      invalidOtp: "Enter the 6-digit code.",
      wrongOtp: "That code is wrong or has expired. Try again or resend.",
      tooMany: "Too many attempts. Please wait a minute and try again.",
      sendFailed: "Couldn't send the OTP. Please try again.",
    },
  },

  onboarding: {
    title: "Set up your dealership",
    editTitle: "Your dealership",
    subtitle: "This appears on every report you share with buyers.",
    ownerName: "Your name",
    businessName: "Dealership name",
    city: "City",
    address: "Address",
    logo: "Logo (optional)",
    logoHint: "PNG or JPG, shown on your reports.",
    chooseLogo: "Choose logo",
    changeLogo: "Change logo",
    removeLogo: "Remove",
    uploading: "Uploading logo…",
    submit: "Save and continue",
    errors: {
      ownerName: "Enter your name.",
      businessName: "Enter your dealership name.",
      city: "Enter your city.",
      address: "Enter your address.",
      logoType: "Logo must be a PNG, JPG or WebP image.",
      logoSize: "Logo is too large. Use an image under 2 MB.",
      logoUpload: "Couldn't upload the logo. Please try again.",
      logoPath: "Logo upload is invalid. Please choose it again.",
    },
  },

  dashboard: {
    myCars: "My cars",
    addCar: "Add car",
    emptyTitle: "No cars yet",
    emptyBody: "Add your first car to start an inspection. It takes about 10 minutes.",
    credits: "Report credits",
    creditsLeft: (n: number) => (n === 1 ? "1 report left" : `${n} reports left`),
    editProfile: "Edit profile",
    status: {
      draft: "Draft",
      inspected: "Inspected",
      published: "Published",
    },
  },

  comingSoon: {
    title: "Coming soon",
    body: "Adding a car is the next step we're building.",
  },
} as const;

export const t = en;
