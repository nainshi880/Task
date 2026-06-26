export const loginUser = async ({ email, password }) => {
  // fake API delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  if (email === "admin@gmail.com" && password === "123456") {
    return {
      token: "fake-jwt-token-123",
      user: {
        id: 1,
        name: "Nainshi",
        email: "admin@gmail.com",
      },
    };
  }

  throw new Error("Invalid email or password");
};