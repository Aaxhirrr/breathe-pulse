import type { ReactNode } from "react";
import { ChatWithCoach } from "components/ChatWithCoach"; // Import the chat component

interface Props {
  children: ReactNode;
}

/**
 * A provider wrapping the whole app.
 *
 * You can add multiple providers here by nesting them,
 * and they will all be applied to the app.
 */
export const AppProvider = ({ children }: Props) => {
  return (
    <>
      {children} { /* Render the main app content */ }
      <ChatWithCoach /> {/* Render chat component globally */}
    </>
  );
};
