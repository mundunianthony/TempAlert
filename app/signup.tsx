import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Pressable,
  StyleSheet,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const { register } = useAuth();

  const handleSignUp = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      Alert.alert("Please fill in all fields");
      return;
    }

    if (!emailRegex.test(email)) {
      Alert.alert("Please enter a valid email address");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Passwords do not match");
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
    <ImageBackground
      source={{
        uri: "https://images.unsplash.com/photo-1744125235979-4286ddb612b5?q=80&w=1974&auto=format&fit=crop",
      }}
      style={styles.background}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
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

        <View style={styles.passwordWrapper}>
          <TextInput
            placeholder="Confirm Password"
            style={[styles.input, styles.passwordInput]}
            secureTextEntry={!showConfirmPassword}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <Pressable
            style={styles.eyeIcon}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            <Ionicons
              name={showConfirmPassword ? "eye-off" : "eye"}
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
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.85)",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#3b82f6",
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    width: "100%",
    marginBottom: 16,
    backgroundColor: "white",
  },
  passwordWrapper: {
    width: "100%",
    marginBottom: 16,
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
    color: "#6b7280",
  },
  loginLink: {
    color: "#3b82f6",
    fontWeight: "600",
  },
});
