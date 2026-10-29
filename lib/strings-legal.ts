// Legal page templates (privacy, terms, refunds, contact). English only, used by the static site
// pages; kept out of lib/strings.ts so they don't ship in the app's browser bundle.

/** Business details filled into the legal templates (BUSINESS in lib/config.ts). */
type LegalBusiness = { legalName: string; address: string; city: string; email: string; grievanceOfficer: string };

// TEMPLATES. Edit these to match your business and have a lawyer review them before relying on them.
// [Brackets] come from BUSINESS in lib/config.ts.
export const legal = {
  updated: (date: string) => `Last updated: ${date}`,
  back: "Back to home",
  privacy: {
    title: "Privacy policy",
    intro: (b: LegalBusiness) =>
      `${b.legalName} ("we", "us") runs Treadmark, an app that helps used-car dealers create and share inspection reports. This policy explains what personal data we collect, why, and the choices you have. It is written to follow India's Digital Personal Data Protection Act, 2023.`,
    sections: (b: LegalBusiness) => [
      {
        heading: "What we collect",
        body: [
          "Account: your mobile number, used to log you in with a one-time code.",
          "Dealer profile: your name, business name, city, address and logo.",
          "Car details: number plate, details from the vehicle registration (RC) record, odometer reading, insurance date, photos you take, damage notes and checklist answers.",
          "Payments: order and payment IDs, amount and status. Card, UPI and bank details are collected by Razorpay, not by us.",
          "Technical data: basic server logs and the cookies needed to keep you logged in. We do not use advertising cookies.",
        ],
      },
      {
        heading: "How we use it",
        body: [
          "To run the app: log you in, save your cars and photos, build reports and PDFs, and keep your credit balance.",
          "To check photos for visible damage with AI. Photos are sent to our AI provider only for this purpose.",
          "To process payments, prevent fraud and abuse, provide support, and meet legal and tax requirements.",
        ],
      },
      {
        heading: "Who we share it with",
        body: [
          "Service providers who process data for us: Supabase (database and file storage), Vercel (hosting), Anthropic (AI photo analysis), Razorpay (payments), our vehicle data (RC) provider and our SMS provider (login codes). Some of them may process data outside India.",
          "Buyers you share a report with: a published report, including its photos, your business name, city and phone number, can be opened by anyone who has the link.",
          "Authorities, when the law requires it.",
          "We do not sell your personal data.",
        ],
      },
      {
        heading: "Your responsibilities for reports",
        body: [
          "Reports are about cars, not people. Avoid photographing faces, documents or other personal details of car owners. Number plates are shown on reports by design.",
        ],
      },
      {
        heading: "How long we keep it",
        body: [
          "We keep your data while your account is active. If you ask us to delete your account we delete your data within 30 days, except records we must keep by law (for example payment records, which tax law requires us to keep for up to 8 years).",
        ],
      },
      {
        heading: "Your rights",
        body: [
          `You can ask to see, correct or delete your personal data, withdraw consent, or nominate someone to act for you. Write to ${b.email}. We will reply within 30 days.`,
        ],
      },
      {
        heading: "Security",
        body: [
          "Data is encrypted in transit, access is limited by account, photos are private unless you publish a report, and report links are long random codes. No system is perfectly secure, so please keep your phone and login codes safe.",
        ],
      },
      {
        heading: "Grievance officer",
        body: [`${b.grievanceOfficer}, ${b.legalName}, ${b.address}. Email: ${b.email}.`],
      },
      {
        heading: "Changes to this policy",
        body: ["We will post any changes on this page and update the date above. For significant changes we will tell you in the app."],
      },
    ],
  },
  terms: {
    title: "Terms of use",
    intro: (b: LegalBusiness) =>
      `These terms are an agreement between you and ${b.legalName} for the use of Treadmark. By creating an account or using the app you accept them. If you do not agree, please do not use the app.`,
    sections: (b: LegalBusiness) => [
      {
        heading: "The service",
        body: [
          "Treadmark gives used-car dealers tools to photograph a car, record its visible condition, and share an inspection report with buyers. It is meant for business use by dealers aged 18 or over.",
        ],
      },
      {
        heading: "Not a mechanical certification",
        body: [
          "Every report is a visual and documented inspection, not a mechanical certification. It is based only on the photos and information you provide.",
          "AI damage notes can miss things or get them wrong. You review, edit and accept every note, and you are responsible for the report you publish. We do not inspect cars or guarantee their condition, history or value.",
        ],
      },
      {
        heading: "Your account",
        body: [
          "Give accurate details, keep your phone and login codes secure, and tell us if you think someone else is using your account. You are responsible for activity on your account.",
        ],
      },
      {
        heading: "Your content",
        body: [
          "You keep ownership of your photos and information. You allow us to store and process them (including AI analysis) to run the service, and to show published reports to anyone with the link.",
          "You confirm you have the right to upload the content, that reports are honest, and that you will not use them to mislead buyers.",
        ],
      },
      {
        heading: "Credits and payments",
        body: [
          "Publishing a report uses 1 credit. Publishing an already published report again is free. New accounts get 3 free credits.",
          "Credits are prepaid, are sold in packs at the prices shown in the app, and do not expire while the service runs. Prices are in Indian rupees [and include / exclude GST: edit this].",
          "Payments are processed by Razorpay. Refunds follow our refund policy.",
        ],
      },
      {
        heading: "Acceptable use",
        body: [
          "Do not use the app for anything unlawful, upload content you have no right to, try to access other dealers' data, overload or reverse-engineer the service, or resell it without our permission.",
        ],
      },
      {
        heading: "Availability and changes",
        body: [
          "We work to keep the app available but cannot promise it will always be uninterrupted or error-free. We may change or improve features, and will give notice of significant changes.",
        ],
      },
      {
        heading: "Limitation of liability",
        body: [
          "We are not a party to any sale between you and a buyer and are not responsible for disputes about a car.",
          "To the extent the law allows, we are not liable for indirect or consequential losses, and our total liability to you is limited to the amount you paid us in the 3 months before the claim.",
        ],
      },
      {
        heading: "Suspension and closing your account",
        body: [
          "You can stop using the app at any time. We may suspend or close accounts that break these terms. Unused credits on accounts closed for breaking these terms are not refunded.",
        ],
      },
      {
        heading: "Law and disputes",
        body: [`These terms are governed by the laws of India. Courts in ${b.city} have exclusive jurisdiction.`],
      },
      {
        heading: "Contact",
        body: [`${b.legalName}, ${b.address}. Email: ${b.email}.`],
      },
    ],
  },
  refunds: {
    title: "Refund and cancellation policy",
    intro: (b: LegalBusiness) =>
      `Treadmark sells prepaid report credits, a digital service from ${b.legalName}. Credits are added to your account straight after payment; nothing is shipped.`,
    sections: (b: LegalBusiness) => [
      {
        heading: "Unused packs",
        body: ["If you have not used any credit from a pack, you can ask for a full refund of that pack within 7 days of buying it."],
      },
      {
        heading: "Used credits",
        body: ["Credits already used to publish a report cannot be refunded. Free sign-up credits have no cash value."],
      },
      {
        heading: "Charged but no credits",
        body: [
          "If money left your account but your credits did not appear within an hour, contact us with the payment ID (shown in Razorpay's confirmation). We will add the credits or refund you in full.",
        ],
      },
      {
        heading: "How refunds are paid",
        body: [
          `Write to ${b.email} with your registered mobile number and payment ID. Approved refunds go back to the original payment method through Razorpay, usually within 5 to 7 working days.`,
        ],
      },
      {
        heading: "Cancellation",
        body: ["There is no subscription to cancel. You can stop using the app at any time; unused credits stay in your account."],
      },
    ],
  },
  contact: {
    title: "Contact us",
    intro: "We're happy to help with your account, reports or payments.",
    business: "Business name",
    address: "Address",
    email: "Email",
    whatsapp: "WhatsApp",
    hours: "Support hours",
    paymentHelp: "For payment questions, include your registered mobile number and the payment ID.",
  },
};
