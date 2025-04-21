// app/login.tsx
import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../src/lib/firebase";
import { useRouter } from "expo-router";
import { useAuth } from "../src/context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const { user } = useAuth();

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace("/dashboard"); // Navigate to the dashboard
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <View className="flex-1 justify-center items-center px-6 bg-white">
      <Text className="text-2xl font-bold mb-4">Login</Text>
      <TextInput
        placeholder="Email"
        className="w-full border rounded p-3 mb-3"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        placeholder="Password"
        className="w-full border rounded p-3 mb-3"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity className="mb-3" onPress={() => router.push("/forgot-password")}>
        <Text className="text-blue-600 text-sm">Forgot Password?</Text>
      </TouchableOpacity>
      <TouchableOpacity
        className="w-full bg-blue-600 p-3 rounded"
        onPress={handleLogin}
      >
        <Text className="text-white text-center font-semibold">Login</Text>
      </TouchableOpacity>

      <TouchableOpacity className="mt-4" onPress={() => router.push("/signup")}>
        <Text className="text-gray-700">Don't have an account? <Text className="text-blue-600">Sign up</Text></Text>
      </TouchableOpacity>
    </View>
  );
}
