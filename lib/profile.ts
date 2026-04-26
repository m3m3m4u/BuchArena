export type Visibility = "internal" | "public" | "hidden";

export type ProfileField = {
  value: string;
  visibility: Visibility;
};

export type ProfileImageCrop = {
  x: number;
  y: number;
  zoom: number;
};

export type ProfileData = {
  deaktiviert?: boolean;
  profileImage: {
    value: string;
    visibility: Visibility;
    crop: ProfileImageCrop;
  };
  name: ProfileField;
  motto: ProfileField;
  ueberMich: ProfileField;
  beruf: ProfileField;
  postalCode: ProfileField;
  city: ProfileField;
  country: ProfileField;
  socialInstagram: ProfileField;
  socialFacebook: ProfileField;
  socialLinkedin: ProfileField;
  socialTiktok: ProfileField;
  socialYoutube: ProfileField;
  socialPinterest: ProfileField;
  socialReddit: ProfileField;
  socialWebsite: ProfileField;
  socialLinktree: ProfileField;
  socialNewsletter: ProfileField;
  socialWhatsapp: ProfileField;
  socialEmail: ProfileField;
};

export type Sprechprobe = {
  id: string;
  filename: string;
  url: string;
  uploadedAt: string;
};

export type SpeakerProfileData = {
  deaktiviert?: boolean;
  profileImage: {
    value: string;
    visibility: Visibility;
    crop: ProfileImageCrop;
  };
  name: ProfileField;
  postalCode: ProfileField;
  ort: ProfileField;
  country: ProfileField;
  motto: ProfileField;
  ueberMich: ProfileField;
  webseite: ProfileField;
  infovideo: ProfileField;
  sprechproben: Sprechprobe[];
  socialInstagram: ProfileField;
  socialFacebook: ProfileField;
  socialLinkedin: ProfileField;
  socialTiktok: ProfileField;
  socialYoutube: ProfileField;
  socialPinterest: ProfileField;
  socialReddit: ProfileField;
  socialWebsite: ProfileField;
  socialLinktree: ProfileField;
  socialNewsletter: ProfileField;
  socialWhatsapp: ProfileField;
  socialEmail: ProfileField;
};

export function createDefaultProfile(): ProfileData {
  return {
    profileImage: {
      value: "",
      visibility: "hidden",
      crop: {
        x: 50,
        y: 50,
        zoom: 1,
      },
    },
    name: {
      value: "",
      visibility: "internal",
    },
    motto: {
      value: "",
      visibility: "internal",
    },
    ueberMich: {
      value: "",
      visibility: "internal",
    },
    beruf: {
      value: "",
      visibility: "internal",
    },
    postalCode: {
      value: "",
      visibility: "internal",
    },
    city: {
      value: "",
      visibility: "internal",
    },
    country: {
      value: "",
      visibility: "internal",
    },
    socialInstagram: {
      value: "",
      visibility: "hidden",
    },
    socialFacebook: {
      value: "",
      visibility: "hidden",
    },
    socialLinkedin: {
      value: "",
      visibility: "hidden",
    },
    socialTiktok: {
      value: "",
      visibility: "hidden",
    },
    socialYoutube: {
      value: "",
      visibility: "hidden",
    },
    socialPinterest: {
      value: "",
      visibility: "hidden",
    },
    socialReddit: {
      value: "",
      visibility: "hidden",
    },
    socialWebsite: {
      value: "",
      visibility: "hidden",
    },
    socialLinktree: {
      value: "",
      visibility: "hidden",
    },
    socialNewsletter: {
      value: "",
      visibility: "hidden",
    },
    socialWhatsapp: {
      value: "",
      visibility: "hidden",
    },
    socialEmail: {
      value: "",
      visibility: "hidden",
    },
  };
}

export type BloggerProfileData = {
  deaktiviert?: boolean;
  profileImage: {
    value: string;
    visibility: Visibility;
    crop: ProfileImageCrop;
  };
  name: ProfileField;
  motto: ProfileField;
  beschreibung: ProfileField;
  lieblingsbuch: ProfileField;
  genres: string; // kommasepariert
  postalCode: ProfileField;
  city: ProfileField;
  country: ProfileField;
  socialInstagram: ProfileField;
  socialFacebook: ProfileField;
  socialLinkedin: ProfileField;
  socialTiktok: ProfileField;
  socialYoutube: ProfileField;
  socialPinterest: ProfileField;
  socialReddit: ProfileField;
  socialWebsite: ProfileField;
  socialLinktree: ProfileField;
  socialNewsletter: ProfileField;
  socialWhatsapp: ProfileField;
  socialEmail: ProfileField;
};

export function createDefaultSpeakerProfile(): SpeakerProfileData {
  return {
    profileImage: {
      value: "",
      visibility: "hidden",
      crop: { x: 50, y: 50, zoom: 1 },
    },
    name: { value: "", visibility: "internal" },
    postalCode: { value: "", visibility: "internal" },
    ort: { value: "", visibility: "internal" },
    country: { value: "", visibility: "internal" },
    motto: { value: "", visibility: "internal" },
    ueberMich: { value: "", visibility: "internal" },
    webseite: { value: "", visibility: "internal" },
    infovideo: { value: "", visibility: "internal" },
    sprechproben: [],
    socialInstagram: { value: "", visibility: "hidden" },
    socialFacebook: { value: "", visibility: "hidden" },
    socialLinkedin: { value: "", visibility: "hidden" },
    socialTiktok: { value: "", visibility: "hidden" },
    socialYoutube: { value: "", visibility: "hidden" },
    socialPinterest: { value: "", visibility: "hidden" },
    socialReddit: { value: "", visibility: "hidden" },
    socialWebsite: { value: "", visibility: "hidden" },
    socialLinktree: { value: "", visibility: "hidden" },
    socialNewsletter: { value: "", visibility: "hidden" },
    socialWhatsapp: { value: "", visibility: "hidden" },
    socialEmail: { value: "", visibility: "hidden" },
  };
}

export function createDefaultBloggerProfile(): BloggerProfileData {
  return {
    profileImage: {
      value: "",
      visibility: "hidden",
      crop: { x: 50, y: 50, zoom: 1 },
    },
    name: { value: "", visibility: "internal" },
    motto: { value: "", visibility: "internal" },
    beschreibung: { value: "", visibility: "internal" },
    lieblingsbuch: { value: "", visibility: "internal" },
    genres: "",
    postalCode: { value: "", visibility: "internal" },
    city: { value: "", visibility: "internal" },
    country: { value: "", visibility: "internal" },
    socialInstagram: { value: "", visibility: "hidden" },
    socialFacebook: { value: "", visibility: "hidden" },
    socialLinkedin: { value: "", visibility: "hidden" },
    socialTiktok: { value: "", visibility: "hidden" },
    socialYoutube: { value: "", visibility: "hidden" },
    socialPinterest: { value: "", visibility: "hidden" },
    socialReddit: { value: "", visibility: "hidden" },
    socialWebsite: { value: "", visibility: "hidden" },
    socialLinktree: { value: "", visibility: "hidden" },
    socialNewsletter: { value: "", visibility: "hidden" },
    socialWhatsapp: { value: "", visibility: "hidden" },
    socialEmail: { value: "", visibility: "hidden" },
  };
}

export type TestleserProfileData = {
  deaktiviert?: boolean;
  profileImage: {
    value: string;
    visibility: Visibility;
    crop: ProfileImageCrop;
  };
  name: ProfileField;
  zuMir: string;
  genres: string; // kommasepariert
  verfuegbar: boolean; // freie Kapazitäten
  postalCode: ProfileField;
  city: ProfileField;
  country: ProfileField;
  socialInstagram: ProfileField;
  socialFacebook: ProfileField;
  socialLinkedin: ProfileField;
  socialTiktok: ProfileField;
  socialYoutube: ProfileField;
  socialPinterest: ProfileField;
  socialReddit: ProfileField;
  socialWebsite: ProfileField;
  socialLinktree: ProfileField;
  socialNewsletter: ProfileField;
  socialWhatsapp: ProfileField;
  socialEmail: ProfileField;
};

export function createDefaultTestleserProfile(): TestleserProfileData {
  return {
    profileImage: {
      value: "",
      visibility: "hidden",
      crop: { x: 50, y: 50, zoom: 1 },
    },
    name: { value: "", visibility: "internal" },
    zuMir: "",
    genres: "",
    verfuegbar: false,
    postalCode: { value: "", visibility: "internal" },
    city: { value: "", visibility: "internal" },
    country: { value: "", visibility: "internal" },
    socialInstagram: { value: "", visibility: "hidden" },
    socialFacebook: { value: "", visibility: "hidden" },
    socialLinkedin: { value: "", visibility: "hidden" },
    socialTiktok: { value: "", visibility: "hidden" },
    socialYoutube: { value: "", visibility: "hidden" },
    socialPinterest: { value: "", visibility: "hidden" },
    socialReddit: { value: "", visibility: "hidden" },
    socialWebsite: { value: "", visibility: "hidden" },
    socialLinktree: { value: "", visibility: "hidden" },
    socialNewsletter: { value: "", visibility: "hidden" },
    socialWhatsapp: { value: "", visibility: "hidden" },
    socialEmail: { value: "", visibility: "hidden" },
  };
}

export type LektorenProfileData = {
  deaktiviert?: boolean;
  profileImage: {
    value: string;
    visibility: Visibility;
    crop: ProfileImageCrop;
  };
  name: ProfileField;
  motto: string;
  zuMir: string;
  kapazitaeten: number[]; // Monatsnummern 1–12 mit Kapazität
  postalCode: ProfileField;
  city: ProfileField;
  country: ProfileField;
  socialInstagram: ProfileField;
  socialFacebook: ProfileField;
  socialLinkedin: ProfileField;
  socialTiktok: ProfileField;
  socialYoutube: ProfileField;
  socialPinterest: ProfileField;
  socialReddit: ProfileField;
  socialWebsite: ProfileField;
  socialLinktree: ProfileField;
  socialNewsletter: ProfileField;
  socialWhatsapp: ProfileField;
  socialEmail: ProfileField;
};

export function createDefaultLektorenProfile(): LektorenProfileData {
  return {
    profileImage: {
      value: "",
      visibility: "hidden",
      crop: { x: 50, y: 50, zoom: 1 },
    },
    name: { value: "", visibility: "internal" },
    motto: "",
    zuMir: "",
    kapazitaeten: [],
    postalCode: { value: "", visibility: "internal" },
    city: { value: "", visibility: "internal" },
    country: { value: "", visibility: "internal" },
    socialInstagram: { value: "", visibility: "hidden" },
    socialFacebook: { value: "", visibility: "hidden" },
    socialLinkedin: { value: "", visibility: "hidden" },
    socialTiktok: { value: "", visibility: "hidden" },
    socialYoutube: { value: "", visibility: "hidden" },
    socialPinterest: { value: "", visibility: "hidden" },
    socialReddit: { value: "", visibility: "hidden" },
    socialWebsite: { value: "", visibility: "hidden" },
    socialLinktree: { value: "", visibility: "hidden" },
    socialNewsletter: { value: "", visibility: "hidden" },
    socialWhatsapp: { value: "", visibility: "hidden" },
    socialEmail: { value: "", visibility: "hidden" },
  };
}

export type VerlageProfileData = {
  deaktiviert?: boolean;
  profileImage: {
    value: string;
    visibility: Visibility;
    crop: ProfileImageCrop;
  };
  name: ProfileField;
  motto: string;
  beschreibung: string;
  ansprechperson: string;
  voraussetzungen: string;
  kapazitaeten: number[]; // Monatsnummern 1–12 mit Kapazität
  postalCode: ProfileField;
  city: ProfileField;
  country: ProfileField;
  socialInstagram: ProfileField;
  socialFacebook: ProfileField;
  socialLinkedin: ProfileField;
  socialTiktok: ProfileField;
  socialYoutube: ProfileField;
  socialPinterest: ProfileField;
  socialReddit: ProfileField;
  socialWebsite: ProfileField;
  socialLinktree: ProfileField;
  socialNewsletter: ProfileField;
  socialWhatsapp: ProfileField;
  socialEmail: ProfileField;
};

export function createDefaultVerlageProfile(): VerlageProfileData {
  return {
    profileImage: {
      value: "",
      visibility: "hidden",
      crop: { x: 50, y: 50, zoom: 1 },
    },
    name: { value: "", visibility: "internal" },
    motto: "",
    beschreibung: "",
    ansprechperson: "",
    voraussetzungen: "",
    kapazitaeten: [],
    postalCode: { value: "", visibility: "internal" },
    city: { value: "", visibility: "internal" },
    country: { value: "", visibility: "internal" },
    socialInstagram: { value: "", visibility: "hidden" },
    socialFacebook: { value: "", visibility: "hidden" },
    socialLinkedin: { value: "", visibility: "hidden" },
    socialTiktok: { value: "", visibility: "hidden" },
    socialYoutube: { value: "", visibility: "hidden" },
    socialPinterest: { value: "", visibility: "hidden" },
    socialReddit: { value: "", visibility: "hidden" },
    socialWebsite: { value: "", visibility: "hidden" },
    socialLinktree: { value: "", visibility: "hidden" },
    socialNewsletter: { value: "", visibility: "hidden" },
    socialWhatsapp: { value: "", visibility: "hidden" },
    socialEmail: { value: "", visibility: "hidden" },
  };
}
