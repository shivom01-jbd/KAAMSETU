import type { Locale } from "./i18n/messages";

type L<T> = Record<Locale, T>;
export type Section = { heading: string; body: string };

export const categories = [
  { slug: "electrician", icon: "⚡", name: { hi: "इलेक्ट्रीशियन", en: "Electrician" } },
  { slug: "plumber", icon: "🔧", name: { hi: "प्लंबर", en: "Plumber" } },
  {
    slug: "ac-fridge",
    icon: "❄️",
    name: { hi: "एसी / फ्रिज टेक्नीशियन", en: "AC / Fridge technician" },
  },
  { slug: "carpenter", icon: "🪚", name: { hi: "कारपेंटर", en: "Carpenter" } },
  { slug: "painter", icon: "🎨", name: { hi: "पेंटर", en: "Painter" } },
  { slug: "driver", icon: "🚗", name: { hi: "ड्राइवर", en: "Driver" } },
  { slug: "developer", icon: "💻", name: { hi: "डेवलपर", en: "Developer" } },
  { slug: "designer", icon: "✏️", name: { hi: "डिज़ाइनर", en: "Designer" } },
  { slug: "engineer", icon: "🛠️", name: { hi: "इंजीनियर", en: "Engineer" } },
  { slug: "teacher", icon: "📚", name: { hi: "शिक्षक", en: "Teacher" } },
  { slug: "media", icon: "🎬", name: { hi: "मीडिया", en: "Media" } },
  { slug: "construction", icon: "🏗️", name: { hi: "निर्माण मजदूर", en: "Construction manpower" } },
] as const;

export const ui = {
  hi: {
    rolesTitle: "आप किस रूप में जुड़ना चाहते हैं?",
    rolesSub: "अपनी जरूरत के अनुसार सही विकल्प चुनें",
    people: "PEOPLE",
    peopleDesc: "यदि आप काम की तलाश में हैं या अपनी सेवाएं देना चाहते हैं",
    peopleBtn: "मैं PEOPLE हूं",
    business: "BUSINESS",
    businessDesc: "यदि आप काम के लिए लोगों को खोजना या हायर करना चाहते हैं",
    businessBtn: "मैं BUSINESS हूं",
    safeLine: "सुरक्षित • विश्वसनीय • आपके पास, आपके लिए",
    categoriesTitle: "सेवा श्रेणियां",
    categoriesIntro: "अपने काम के लिए सही कौशल चुनें। और श्रेणियां जल्द जुड़ेंगी।",
    howTitle: "कैसे काम करता है",
    trustTitle: "भरोसा और सुरक्षा",
    termsTitle: "नियम और शर्तें",
    privacyTitle: "गोपनीयता नीति",
    helpTitle: "सहायता और संपर्क",
    draftNote: "यह मसौदा है। लॉन्च से पहले किसी वकील से समीक्षा ज़रूरी है।",
    soonTitle: "जल्द आ रहा है",
    soonBody: "साइन-अप और लॉगिन अगले चरण में बनेंगे। अभी कोई खाता नहीं बन सकता।",
    back: "वापस जाएं",
    language: "भाषा",
    footerHelp: "सहायता",
    selectedRole: "चुना गया विकल्प",
    home: "होम",
  },
  en: {
    rolesTitle: "How do you want to join?",
    rolesSub: "Choose the option that fits your need",
    people: "PEOPLE",
    peopleDesc: "If you are looking for work or want to offer your services",
    peopleBtn: "I am PEOPLE",
    business: "BUSINESS",
    businessDesc: "If you want to find or hire people for work",
    businessBtn: "I am BUSINESS",
    safeLine: "Safe • Trusted • Near you, for you",
    categoriesTitle: "Service categories",
    categoriesIntro: "Pick the skill you need. More categories will be added soon.",
    howTitle: "How it works",
    trustTitle: "Trust and safety",
    termsTitle: "Terms and conditions",
    privacyTitle: "Privacy policy",
    helpTitle: "Help and contact",
    draftNote: "This is a draft. A lawyer must review it before launch.",
    soonTitle: "Coming soon",
    soonBody: "Sign-up and login are built in the next milestone. No account can be created yet.",
    back: "Go back",
    language: "Language",
    footerHelp: "Help",
    selectedRole: "Selected",
    home: "Home",
  },
} as const satisfies L<Record<string, string>>;

export const pages: Record<
  "how" | "trust" | "terms" | "privacy" | "help",
  { intro: L<string>; sections: L<Section[]> }
> = {
  how: {
    intro: {
      hi: "चार आसान कदमों में सही व्यक्ति तक पहुंचें।",
      en: "Reach the right person in four simple steps.",
    },
    sections: {
      hi: [
        { heading: "1. खाता बनाएं", body: "मोबाइल नंबर और ईमेल से सत्यापित खाता बनाएं।" },
        { heading: "2. खोजें", body: "कौशल, इलाका, दूरी, कीमत और रेटिंग से प्रोफेशनल खोजें।" },
        {
          heading: "3. अनुरोध भेजें",
          body: "काम का विवरण और समय बताएं। प्रोफेशनल स्वीकार या अस्वीकार करता है।",
        },
        {
          heading: "4. काम पूरा होने पर रिव्यू दें",
          body: "पूरे हुए काम के बाद ही रेटिंग और रिव्यू दिया जा सकता है।",
        },
      ],
      en: [
        {
          heading: "1. Create an account",
          body: "Sign up with a verified mobile number and email.",
        },
        {
          heading: "2. Search",
          body: "Find professionals by skill, area, distance, price and rating.",
        },
        {
          heading: "3. Send a request",
          body: "Describe the job and preferred time. The professional accepts or rejects.",
        },
        {
          heading: "4. Review after the job",
          body: "Ratings and reviews are allowed only after a completed job.",
        },
      ],
    },
  },
  trust: {
    intro: {
      hi: "आपकी सुरक्षा हमारी प्राथमिकता है।",
      en: "Your safety comes first.",
    },
    sections: {
      hi: [
        {
          heading: "सत्यापन",
          body: "वेरिफाइड बैज तभी दिखता है जब हमारी टीम दस्तावेज़ जांच ले। प्रोफेशनल खुद बैज नहीं लगा सकते।",
        },
        {
          heading: "आपका पता निजी रहता है",
          body: "घर का सही पता और सटीक लोकेशन सार्वजनिक नहीं दिखाई जाती। केवल अनुमानित इलाका दिखता है।",
        },
        {
          heading: "रिपोर्ट करें",
          body: "किसी भी गलत व्यवहार, स्पैम या नकली प्रोफाइल की रिपोर्ट करें। हमारी टीम समीक्षा करेगी।",
        },
        {
          heading: "सावधानी",
          body: "काम शुरू होने से पहले दाम और शर्तें तय करें। किसी अजनबी को OTP न बताएं।",
        },
      ],
      en: [
        {
          heading: "Verification",
          body: "The Verified badge appears only after our team checks documents. Professionals cannot award it to themselves.",
        },
        {
          heading: "Your address stays private",
          body: "Exact home addresses and coordinates are never shown publicly. Only an approximate area is visible.",
        },
        {
          heading: "Report a problem",
          body: "Report misconduct, spam or fake profiles. Our team reviews every report.",
        },
        {
          heading: "Stay careful",
          body: "Agree on price and terms before work starts. Never share an OTP with anyone.",
        },
      ],
    },
  },
  terms: {
    intro: { hi: "मसौदा नियम", en: "Draft terms" },
    sections: {
      hi: [
        {
          heading: "सेवा का स्वरूप",
          body: "KAAMSETU ग्राहकों, प्रोफेशनल और व्यवसायों को जोड़ने का मंच है। काम की गुणवत्ता और भुगतान सीधे संबंधित पक्षों के बीच तय होते हैं।",
        },
        {
          heading: "खाते",
          body: "आप सही जानकारी देने और अपने खाते की सुरक्षा के लिए जिम्मेदार हैं।",
        },
        {
          heading: "उचित उपयोग",
          body: "स्पैम, धोखाधड़ी, नकली रिव्यू और उत्पीड़न मना है। उल्लंघन पर खाता निलंबित हो सकता है।",
        },
      ],
      en: [
        {
          heading: "Nature of the service",
          body: "KAAMSETU is a platform that connects customers, professionals and businesses. Work quality and payment are agreed directly between the parties.",
        },
        {
          heading: "Accounts",
          body: "You are responsible for giving accurate information and keeping your account secure.",
        },
        {
          heading: "Fair use",
          body: "Spam, fraud, fake reviews and harassment are prohibited. Violations may lead to suspension.",
        },
      ],
    },
  },
  privacy: {
    intro: { hi: "मसौदा नीति", en: "Draft policy" },
    sections: {
      hi: [
        {
          heading: "हम क्या जानकारी लेते हैं",
          body: "नाम, संपर्क, कौशल, अनुमानित इलाका और आपके द्वारा दिए गए दस्तावेज़।",
        },
        {
          heading: "लोकेशन",
          body: "लोकेशन की अनुमति केवल ज़रूरत पड़ने पर मांगी जाएगी। आप हाथ से भी इलाका डाल सकते हैं।",
        },
        {
          heading: "आपके अधिकार",
          body: "आप अपनी जानकारी देख, सुधार या हटवा सकते हैं। प्रक्रिया लॉन्च से पहले जोड़ी जाएगी।",
        },
      ],
      en: [
        {
          heading: "What we collect",
          body: "Name, contact details, skills, approximate area and documents you upload.",
        },
        {
          heading: "Location",
          body: "Location permission is requested only when needed. You can also enter your area manually.",
        },
        {
          heading: "Your rights",
          body: "You can view, correct or delete your data. The exact process will be added before launch.",
        },
      ],
    },
  },
  help: {
    intro: {
      hi: "मदद चाहिए? नीचे देखें।",
      en: "Need help? See below.",
    },
    sections: {
      hi: [
        {
          heading: "OTP नहीं आया?",
          body: "नंबर जांचें और एक मिनट बाद दोबारा भेजें। OTP किसी को न बताएं।",
        },
        {
          heading: "प्रोफेशनल की शिकायत",
          body: "उसकी प्रोफाइल से रिपोर्ट करें। यह सुविधा अगले चरणों में जुड़ेगी।",
        },
        { heading: "संपर्क", body: "सहायता ईमेल और फोन अभी जोड़े जाने बाकी हैं।" },
      ],
      en: [
        {
          heading: "Did not get an OTP?",
          body: "Check the number and resend after a minute. Never share the OTP.",
        },
        {
          heading: "Report a professional",
          body: "Report from their profile. This feature arrives in later milestones.",
        },
        { heading: "Contact", body: "Support email and phone are still to be added." },
      ],
    },
  },
};
