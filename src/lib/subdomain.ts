// Stub: Subdomain detection is not used in single-tenant mode
export const getSubdomain = () => {
  return null;
};

export const extractSubdomain = (hostname: string) => {
  return null;
};

export const getCompanyBySubdomain = async (subdomain: string) => {
  return null;
};

export const buildSubdomainUrl = (subdomain: string) => {
  return window.location.origin;
};
