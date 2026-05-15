import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { registerUser } from "../services/authService";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert("Missing details", "Please enter email and password.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }

    try {
      await registerUser(email.trim(), password);

      Alert.alert("Success", "Account created successfully.");

      router.replace("/(tabs)/home");
    } catch (error: any) {
      Alert.alert("Registration failed", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>STEMM Lab</Text>

      <Text style={styles.subtitle}>Create an account to continue</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#777"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#777"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Pressable style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Register</Text>
      </Pressable>

      <Pressable onPress={() => router.push("/login_screen")}>
        <Text style={styles.link}>Already have an account? Login</Text>
      </Pressable>

      <Pressable onPress={() => router.replace("/(tabs)/home")}>
        <Text style={styles.skipLink}>Skip for now</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },

  title: {
    fontSize: 36,
    fontWeight: "800",
    textAlign: "center",
    color: "#000000",
  },

  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 28,
    color: "#666666",
  },

  input: {
    borderWidth: 1,
    borderColor: "#cccccc",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    fontSize: 16,
    color: "#000000",
  },

  button: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },

  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },

  link: {
    textAlign: "center",
    color: "#2563eb",
    fontWeight: "700",
    marginTop: 18,
  },

  skipLink: {
    textAlign: "center",
    color: "#666666",
    fontWeight: "700",
    marginTop: 14,
  },
});