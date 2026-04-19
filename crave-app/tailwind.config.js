
/** @type {import('tailwindcss').Config} */
module.exports = {
    // NOTE: Update this to include the paths to all of your component files.
    content: [
      "./app/**/*.{js,jsx,ts,tsx}",
      "./components/**/*.{js,jsx,ts,tsx}",
      "./pages/**/*.{js,jsx,ts,tsx}",
    ],
    presets: [require("nativewind/preset")],
    theme: {
      extend: {
        fontFamily: {
          "josefin": ["JosefinSans_400Regular"],
          "josefin-thin": ["JosefinSans_100Thin"],
          "josefin-light": ["JosefinSans_300Light"],
          "josefin-bold": ["JosefinSans_700Bold"],
          "josefin-italic": ["JosefinSans_400Regular_Italic"],
          "josefin-thin-italic": ["JosefinSans_100Thin_Italic"],
          "josefin-light-italic": ["JosefinSans_300Light_Italic"],
          "josefin-bold-italic": ["JosefinSans_700Bold_Italic"],
        },
      },
    },
    plugins: [],
  }