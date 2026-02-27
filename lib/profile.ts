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
  profileImage: {
    value: string;
    visibility: Visibility;
    crop: ProfileImageCrop;
  };
  name: ProfileField;
  motto: ProfileField;
  beruf: ProfileField;
  city: ProfileField;
  country: ProfileField;
  socialInstagram: ProfileField;
  socialFacebook: ProfileField;
  socialLinkedin: ProfileField;
  socialTiktok: ProfileField;
  socialYoutube: ProfileField;
  socialPinterest: ProfileField;
  socialReddit: ProfileField;
};

export type Sprechprobe = {
  id: string;
  filename: string;
  url: string;
  uploadedAt: string;
};

export type SpeakerProfileData = {
  name: ProfileField;
  ort: ProfileField;
  motto: ProfileField;
  webseite: ProfileField;
  infovideo: ProfileField;
  sprechproben: Sprechprobe[];
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
    beruf: {
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
  };
}

export function createDefaultSpeakerProfile(): SpeakerProfileData {
  return {
    name: { value: "", visibility: "internal" },
    ort: { value: "", visibility: "internal" },
    motto: { value: "", visibility: "internal" },
    webseite: { value: "", visibility: "internal" },
    infovideo: { value: "", visibility: "internal" },
    sprechproben: [],
  };
}
