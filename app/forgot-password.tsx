import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const router = useRouter();

  const handleForgotPassword = () => {
    if (!email) {
      Alert.alert("Please enter your email");
      return;
    }
    // Add logic for password reset
    Alert.alert("Password reset link sent to your email");
    router.push("/login");
  };

  return (
    <View className="flex-1 justify-center items-center px-6 bg-white">
      <Text className="text-2xl font-bold mb-4">Forgot Password</Text>
      <TextInput
        placeholder="Email"
        className="w-full border rounded p-3 mb-3"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TouchableOpacity
        className="w-full bg-blue-600 p-3 rounded"
        onPress={handleForgotPassword}
      >
        <Text className="text-white text-center font-semibold">Reset Password</Text>
      </TouchableOpacity>
    </View>
  );
}
