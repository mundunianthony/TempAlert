import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import auth from "@react-native-firebase/auth";
import { useRouter } from "expo-router";
import { useAuth } from "../src/context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please fill in both fields.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await auth().signInWithEmailAndPassword(email, password);
      router.replace("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center items-center px-6 bg-white">
      <Text className="text-3xl font-bold mb-6 text-black">Welcome Back</Text>

      {error ? (
        <View className="w-full bg-red-100 border border-red-400 rounded p-3 mb-4">
          <Text className="text-red-700">{error}</Text>
        </View>
      ) : null}

      <TextInput
        placeholder="Email"
        className="w-full border border-gray-300 rounded p-3 mb-3 text-black"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Password"
        className="w-full border border-gray-300 rounded p-3 mb-3 text-black"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        className="mb-3 self-end"
        onPress={() => router.push("/forgot-password")}
      >
        <Text className="text-blue-600 text-sm">Forgot Password?</Text>
      </TouchableOpacity>

      <TouchableOpacity
        className={`w-full p-3 rounded ${
          loading ? "bg-blue-400" : "bg-blue-600"
        }`}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white text-center font-semibold">Login</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity className="mt-6" onPress={() => router.push("/signup")}>
        <Text className="text-gray-700">
          Don't have an account? <Text className="text-blue-600">Sign up</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}
