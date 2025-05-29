import { Redirect } from "expo-router";
import { useEffect } from "react";

export default function Index() {
  useEffect(() => {
    console.log("Redirecting to /login...");
  }, []);

  return <Redirect href="/login" />;
}
