import { sleep } from "workflow";

type User = {
  id: string;
  email: string;
};

async function createUser(email: string): Promise<User> {
  // Replace with your real user-creation implementation.
  return {
    id: crypto.randomUUID(),
    email,
  };
}

async function sendWelcomeEmail(_user: User): Promise<void> {
  // Replace with your real welcome-email implementation.
}

async function sendOnboardingEmail(_user: User): Promise<void> {
  // Replace with your real onboarding-email implementation.
}

export async function handleUserSignup(email: string) {
  "use workflow";

  const user = await createUser(email);
  await sendWelcomeEmail(user);

  await sleep("5s");

  await sendOnboardingEmail(user);
  return {
    userId: user.id,
    status: "onboarded",
  };
}
