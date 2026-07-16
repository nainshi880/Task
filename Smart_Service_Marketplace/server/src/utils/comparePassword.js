import bcrypt from "bcrypt";

const comparePassword = async (
  password,
  hashedPassword
) => {
  return await bcrypt.compare(
    password,
    hashedPassword
  );
};

export default comparePassword;