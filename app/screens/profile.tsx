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
} from "react-native";
import { useAuth } from "@/src/context/AuthContext";
import { updatePassword, updateProfile, updateEmail } from "firebase/auth";
import Navbar from "@/src/components/Navbar";
import { useRouter } from "expo-router";

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpdateProfile = async () => {
    if (!user) return;

    setLoading(true);
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
        await updatePassword(user, newPassword);
      }

      Alert.alert("Success", "Profile updated successfully.");
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.outerContainer}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Update Profile</Text>

          <Text style={styles.label}>Display Name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
          />

          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>New Password</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholder="Leave blank to keep current password"
          />

          <TouchableOpacity
            style={[styles.button, loading && { backgroundColor: "#ccc" }]}
            onPress={handleUpdateProfile}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Updating..." : "Save Changes"}
            </Text>
          </TouchableOpacity>
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
    backgroundColor: "#f3f4f6",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  outerContainer: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 100, // enough space for navbar
    backgroundColor: "#f3f4f6",
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
    color: "#000",
  },
  label: {
    fontSize: 16,
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    color: "#111827",
  },
  button: {
    backgroundColor: "#2563eb",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
    marginBottom: 24,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
