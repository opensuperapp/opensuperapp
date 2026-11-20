// Copyright (c) 2025 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.
import BrandIcon from "@/components/brand/BrandIcon";
import PrimaryButton from "@/components/brand/PrimaryButton";
import { textStyle, themes, type } from "@/constants/brand";
import { useBrandTheme } from "@/hooks/useBrandTheme";
import { useSignInWithAsgardeo } from "@/hooks/useSignInWithAsgardeo";
import React, { useState } from "react";
import { StyleSheet, Text } from "react-native";

/**
 * SignInMessage is a presentational component displayed inside the sign-in modal.
 * It shows a sign-in icon, informative text, and a button to trigger the sign-in flow using Asgardeo.
 *
 * While the sign-in request is in flight the button shows the Wheel loader.
 * `onArtwork` draws it over the always-dark sign-in artwork: no icon (the logo
 * above it carries the screen) and the dark tokens whatever the OS theme.
 */
const SignInMessage = React.memo(
  ({
    title = "Sign in Required",
    message = "Please sign in to continue using the app",
    onArtwork = false,
  }: {
    title?: string;
    message?: string;
    onArtwork?: boolean;
  }) => {
    const theme = useBrandTheme();
    const colors = onArtwork ? themes.dark : theme.colors;
    const [isLoading, setIsLoading] = useState(false);

    const performSignIn = useSignInWithAsgardeo();

    const handleSignInPress = async () => {
      setIsLoading(true);
      try {
        await performSignIn();
      } catch (error) {
        console.error("Sign-in process failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <>
        {!onArtwork && (
          <BrandIcon
            name="user"
            size={40}
            color={colors.accent}
            strokeWidth={1.5}
          />
        )}

        {/* Title */}
        <Text
          style={[styles.title, { color: colors.text }]}
          accessibilityRole="header"
        >
          {title}
        </Text>

        {/* Description */}
        <Text style={[styles.message, { color: colors.text2 }]}>
          {message}
        </Text>

        <PrimaryButton
          title="Sign In"
          onPress={handleSignInPress}
          loading={isLoading}
          style={styles.button}
        />
      </>
    );
  }
);

export default SignInMessage;

const styles = StyleSheet.create({
  title: {
    ...textStyle(type.sectionHeading),
    textAlign: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  message: {
    ...textStyle({ ...type.excerpt, size: 15 }),
    textAlign: "center",
    marginBottom: 28,
  },
  button: {
    alignSelf: "stretch",
  },
});
