import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Pressable,
} from "react-native";
import { useState } from "react";
import { Link, useRouter } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";

const SignUpScreen = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const { register } = useAuth();

  const handleSignUp = async () => {
    if (!firstName || !lastName || !email || !password) {
      Alert.alert("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      await register(email, password, firstName);
      router.replace("/");
    } catch (err) {
      Alert.alert(
        "Signup Error",
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center items-center bg-white px-6">
      <Text className="text-3xl font-bold text-blue-500 mb-6">TempAlert</Text>

      {/* First Name */}
      <TextInput
        placeholder="First Name"
        className="border border-gray-300 rounded-lg px-4 py-2 w-full mb-4"
        value={firstName}
        onChangeText={setFirstName}
      />

      {/* Last Name */}
      <TextInput
        placeholder="Last Name"
        className="border border-gray-300 rounded-lg px-4 py-2 w-full mb-4"
        value={lastName}
        onChangeText={setLastName}
      />

      {/* Email */}
      <TextInput
        placeholder="Email"
        className="border border-gray-300 rounded-lg px-4 py-2 w-full mb-4"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      {/* Password + Eye Toggle */}
      <View className="w-full mb-6 relative">
        <TextInput
          placeholder="Password"
          className="border border-gray-300 rounded-lg px-4 py-2 pr-10"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
        />
        <Pressable
          className="absolute right-3 top-3"
          onPress={() => setShowPassword(!showPassword)}
        >
          <Ionicons
            name={showPassword ? "eye-off" : "eye"}
            size={22}
            color="gray"
          />
        </Pressable>
      </View>

      {/* Sign Up Button */}
      <TouchableOpacity
        className="bg-blue-500 rounded-lg px-4 py-2 w-full mb-4"
        onPress={handleSignUp}
        disabled={loading}
      >
        <Text className="text-white text-center font-semibold">
          {loading ? "Creating Account..." : "Sign Up"}
        </Text>
      </TouchableOpacity>

      {/* Switch to Login */}
      <Text className="text-gray-500">
        Already have an account?{" "}
        <Link href="../login">
          <Text className="text-blue-500 font-semibold">Login</Text>
        </Link>
      </Text>
    </View>
  );
};

export default SignUpScreen;
