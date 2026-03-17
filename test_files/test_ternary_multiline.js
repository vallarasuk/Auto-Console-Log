function getProfileImage(req) {
  const profileImage =
    req && req.files && (req.files.profile_picture || req.files.photo)
      ? req.files.profile_picture || req.files.photo
      : "";
  return profileImage;
}
