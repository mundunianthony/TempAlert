import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  SafeAreaView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Animated,
} from "react-native";
import { useAuth } from "@/src/context/AuthContext";
import { updatePassword, updateProfile, updateEmail } from "firebase/auth";
import { reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import Navbar from "@/src/components/Navbar";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function Profile() {
  const { user, refreshUser, logout } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [securityStep, setSecurityStep] = useState<"verify" | "set">("verify");
  const [securityError, setSecurityError] = useState("");

  // Animation for success message
  const [fadeAnim] = useState(new Animated.Value(0));

  const checkPasswordStrength = (password: string) => {
    if (!password) {
      setPasswordStrength(0);
      return;
    }

    let strength = 0;

    // Length check
    if (password.length >= 8) strength += 1;

    // Contains number
    if (/\d/.test(password)) strength += 1;

    // Contains lowercase
    if (/[a-z]/.test(password)) strength += 1;

    // Contains uppercase
    if (/[A-Z]/.test(password)) strength += 1;

    // Contains special character
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;

    setPasswordStrength(strength);
  };

  const getPasswordStrengthLabel = () => {
    if (passwordStrength === 0) return "";
    if (passwordStrength < 3) return "Weak";
    if (passwordStrength < 5) return "Medium";
    return "Strong";
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength === 0) return "#e2e8f0"; // Slate-200
    if (passwordStrength < 3) return "#ef4444"; // Red-500
    if (passwordStrength < 5) return "#f59e0b"; // Amber-500
    return "#10b981"; // Green-500
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    // Basic validation
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    if (newPassword && newPassword.length < 6) {
      Alert.alert(
        "Password Too Short",
        "Password must be at least 6 characters long."
      );
      return;
    }

    setLoading(true);
    setSuccessMessage("");

    try {
      // Update display name
      if (displayName && displayName !== user.displayName) {
        await updateProfile(user, { displayName });
        await refreshUser();
      }

      // Update email
      if (email && email !== user.email) {
        await updateEmail(user, email);
      }

      // Update password
      if (newPassword.length >= 6) {
        if (user) {
          await updatePassword(user, newPassword);
          setNewPassword(""); // Clear password field after successful update
          setPasswordStrength(0);
        }
      }

      // Show success message with animation
      setSuccessMessage("Profile updated successfully");
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTimeout(() => setSuccessMessage(""), 300);
      });
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCurrentPassword = async () => {
    setLoading(true);
    setSecurityError("");
    try {
      if (!user?.email) throw new Error("No user email found.");
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await reauthenticateWithCredential(user, credential);
      setSecurityStep("set");
      setCurrentPassword("");
    } catch (err: any) {
      setSecurityError("Incorrect password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    setSecurityError("");
    if (newPassword.length < 6) {
      setSecurityError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== repeatPassword) {
      setSecurityError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      if (user) {
        await updatePassword(user, newPassword);
        setNewPassword("");
        setRepeatPassword("");
        setPasswordStrength(0);
        setSecurityStep("verify");
        setSuccessMessage("Password updated successfully");
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.delay(2000),
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setTimeout(() => setSuccessMessage(""), 300);
        });
      }
    } catch (err: any) {
      setSecurityError(err.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.outerContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Avatar */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {displayName
                  ? displayName.charAt(0).toUpperCase()
                  : user?.email?.charAt(0).toUpperCase() || "U"}
              </Text>
            </View>
            <Text style={styles.emailText}>{user?.email}</Text>
          </View>

          {/* Success Message */}
          {successMessage ? (
            <Animated.View
              style={[styles.successContainer, { opacity: fadeAnim }]}
            >
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.successText}>{successMessage}</Text>
            </Animated.View>
          ) : null}

          {/* Form Section */}
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Personal Information</Text>

            <Text style={styles.label}>Display Name</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="person-outline"
                size={20}
                color="#64748b"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Enter your name"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="mail-outline"
                size={20}
                color="#64748b"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="Enter your email"
                placeholderTextColor="#94a3b8"
                editable={false}
                selectTextOnFocus={false}
              />
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Security</Text>
            {securityStep === "verify" ? (
              <>
                <Text style={styles.label}>Current Password</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#64748b"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry={!showPassword}
                    placeholder="Enter your current password"
                    placeholderTextColor="#94a3b8"
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#64748b"
                    />
                  </TouchableOpacity>
                </View>
                {securityError ? (
                  <Text
                    style={{
                      color: "#ef4444",
                      fontSize: 12,
                      marginBottom: 8,
                    }}
                  >
                    {securityError}
                  </Text>
                ) : null}
                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleVerifyCurrentPassword}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.buttonText}>Next</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.label}>New Password</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#64748b"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    value={newPassword}
                    onChangeText={(text) => {
                      setNewPassword(text);
                      checkPasswordStrength(text);
                    }}
                    secureTextEntry={!showPassword}
                    placeholder="Enter new password"
                    placeholderTextColor="#94a3b8"
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#64748b"
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.label}>Repeat New Password</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#64748b"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    value={repeatPassword}
                    onChangeText={setRepeatPassword}
                    secureTextEntry={!showPassword}
                    placeholder="Repeat new password"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                {newPassword ? (
                  <View style={styles.passwordStrengthContainer}>
                    <View style={styles.strengthBars}>
                      {[1, 2, 3, 4, 5].map((level) => (
                        <View
                          key={level}
                          style={[
                            styles.strengthBar,
                            {
                              backgroundColor:
                                level <= passwordStrength
                                  ? getPasswordStrengthColor()
                                  : "#e2e8f0",
                            },
                          ]}
                        />
                      ))}
                    </View>
                    <Text
                      style={[
                        styles.strengthText,
                        { color: getPasswordStrengthColor() },
                      ]}
                    >
                      {getPasswordStrengthLabel()}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.passwordHint}>
                    Password must be at least 6 characters
                  </Text>
                )}
                {securityError ? (
                  <Text
                    style={{
                      color: "#ef4444",
                      fontSize: 12,
                      marginBottom: 8,
                    }}
                  >
                    {securityError}
                  </Text>
                ) : null}
                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleUpdatePassword}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.buttonText}>Save Password</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ alignSelf: "flex-end", marginTop: 8 }}
                  onPress={() => {
                    setSecurityStep("verify");
                    setNewPassword("");
                    setRepeatPassword("");
                    setSecurityError("");
                  }}
                >
                  <Text style={{ color: "#0891b2", fontSize: 13 }}>Back</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleUpdateProfile}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Save Changes</Text>
            )}
          </TouchableOpacity>

          <View style={styles.logoutContainer}>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={() => {
                Alert.alert("Logout", "Are you sure you want to logout?", [
                  {
                    text: "Cancel",
                    style: "cancel",
                  },
                  {
                    text: "Logout",
                    onPress: () => {
                      logout();
                    },
                  },
                ]);
              }}
            >
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <Navbar
          onRefresh={() => {}}
          onNavigateProfile={() => {}}
          onNavigateHome={() => router.replace("/screens/dashboard")}
          onNavigateAlerts={() => router.push("/screens/alerts")}
          alerts={[]}
          activeTab="profile"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc", // Light slate background
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  outerContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: "#f8fafc",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#0f172a", // Slate-900
  },
  container: {
    paddingHorizontal: 24,
    paddingBottom: 100, // enough space for navbar
    backgroundColor: "#f8fafc",
  },
  avatarContainer: {
    alignItems: "center",
    marginVertical: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#0891b2", // Cyan-600
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#ffffff",
  },
  emailText: {
    fontSize: 16,
    color: "#64748b", // Slate-500
  },
  successContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#d1fae5", // Light green
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  successText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#10b981", // Green-500
  },
  formSection: {
    marginBottom: 24,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0f172a", // Slate-900
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748b", // Slate-500
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9", // Slate-100
    borderRadius: 12,
    marginBottom: 16,
  },
  inputIcon: {
    marginLeft: 16,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: "#0f172a", // Slate-900
  },
  passwordInput: {
    paddingRight: 40, // Space for the eye icon
  },
  eyeIcon: {
    position: "absolute",
    right: 16,
  },
  passwordHint: {
    fontSize: 12,
    color: "#94a3b8", // Slate-400
    marginTop: -8,
    marginBottom: 8,
  },
  passwordStrengthContainer: {
    marginTop: -8,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  strengthBars: {
    flexDirection: "row",
    flex: 1,
    marginRight: 12,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    marginRight: 4,
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: "500",
    width: 60,
    textAlign: "right",
  },
  button: {
    backgroundColor: "#0891b2", // Cyan-600
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 24,
  },
  buttonDisabled: {
    backgroundColor: "#94a3b8", // Slate-400
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 16,
  },
  logoutContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "#fee2e2", // Light red
  },
  logoutText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "500",
    color: "#ef4444", // Red-500
  },
});
