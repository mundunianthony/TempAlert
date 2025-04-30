import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Pressable,
  StyleSheet,
} from "react-native";
import { useState } from "react";
import { Link, useRouter } from "expo-router";
import { useAuth } from "@/src/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";

export default function SignUpScreen() {
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
      await register(firstName, lastName, email, password);
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
    <View style={styles.container}>
      <Text style={styles.title}>TempAlert</Text>

      <TextInput
        placeholder="First Name"
        style={styles.input}
        value={firstName}
        onChangeText={setFirstName}
      />

      <TextInput
        placeholder="Last Name"
        style={styles.input}
        value={lastName}
        onChangeText={setLastName}
      />

      <TextInput
        placeholder="Email"
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <View style={styles.passwordWrapper}>
        <TextInput
          placeholder="Password"
          style={[styles.input, styles.passwordInput]}
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
        />
        <Pressable
          style={styles.eyeIcon}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Ionicons
            name={showPassword ? "eye-off" : "eye"}
            size={22}
            color="gray"
          />
        </Pressable>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={handleSignUp}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Creating Account..." : "Sign Up"}
        </Text>
      </TouchableOpacity>

      <Text style={styles.loginText}>
        Already have an account?{" "}
        <Link href="../login">
          <Text style={styles.loginLink}>Login</Text>
        </Link>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#3b82f6", // Tailwind's blue-500
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db", // Tailwind's gray-300
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    width: "100%",
    marginBottom: 16,
  },
  passwordWrapper: {
    width: "100%",
    marginBottom: 24,
    position: "relative",
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeIcon: {
    position: "absolute",
    right: 12,
    top: 12,
  },
  button: {
    backgroundColor: "#3b82f6",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: "100%",
    marginBottom: 16,
  },
  buttonText: {
    color: "#ffffff",
    textAlign: "center",
    fontWeight: "600",
  },
  loginText: {
    color: "#6b7280", // Tailwind's gray-500
  },
  loginLink: {
    color: "#3b82f6",
    fontWeight: "600",
  },
});
