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
  import { styled } from "nativewind/native";
  import { Ionicons } from "@expo/vector-icons";
 

  
  const StyledView = styled(View);
  const StyledText = styled(Text);
  const StyledTextInput = styled(TextInput);
  const StyledTouchableOpacity = styled(TouchableOpacity);
  const StyledPressable = styled(Pressable);
  
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
        await register(email, password, firstName); // You can store full name if desired
        router.replace("/"); // Replace "/dashboard" with a valid route
      } catch (err) {
        Alert.alert("Signup Error", err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };
  
    return (
      <StyledView className="flex-1 justify-center items-center bg-white px-6">
        <StyledText className="text-3xl font-bold text-blue-500 mb-6">
          TempAlert
        </StyledText>
  
        {/* First Name */}
        <StyledTextInput
          placeholder="First Name"
          className="border border-gray-300 rounded-lg px-4 py-2 w-full mb-4"
          value={firstName}
          onChangeText={setFirstName}
        />
  
        {/* Last Name */}
        <StyledTextInput
          placeholder="Last Name"
          className="border border-gray-300 rounded-lg px-4 py-2 w-full mb-4"
          value={lastName}
          onChangeText={setLastName}
        />
  
        {/* Email */}
        <StyledTextInput
          placeholder="Email"
          className="border border-gray-300 rounded-lg px-4 py-2 w-full mb-4"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
  
        {/* Password + Eye Toggle */}
        <StyledView className="w-full mb-6 relative">
          <StyledTextInput
            placeholder="Password"
            className="border border-gray-300 rounded-lg px-4 py-2 pr-10"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <StyledPressable
            className="absolute right-3 top-3"
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? "eye-off" : "eye"}
              size={22}
              color="gray"
            />
          </StyledPressable>
        </StyledView>
  
        {/* Sign Up Button */}
        <StyledTouchableOpacity
          className="bg-blue-500 rounded-lg px-4 py-2 w-full mb-4"
          onPress={handleSignUp}
          disabled={loading}
        >
          <StyledText className="text-white text-center font-semibold">
            {loading ? "Creating Account..." : "Sign Up"}
          </StyledText>
        </StyledTouchableOpacity>
  
        {/* Switch to Login */}
        <StyledText className="text-gray-500">
          Already have an account?{" "}
          <Link href="/login">
            <Text className="text-blue-500 font-semibold">Login</Text>
          </Link>
        </StyledText>
      </StyledView>
    );
  }
