export default {
  expo: {
    name: "pool-hall-waitlist",
    slug: "pool-hall-waitlist",
    owner: "tdipietro87",
    version: "1.0.0",
    platforms: ["ios", "android", "web"],
    scheme: "poolhall",
    sdkVersion: "53.0.0",
    ios: {
      bundleIdentifier: "com.tdipietro87.poolhall",
      infoPlist: {
      "ITSAppUsesNonExemptEncryption": false
    },
    },
     android: {
    package: "com.tdipietro87.poolhall"
  },
    extra: {
      apiBaseUrl: "https://api.tylerdipietro.com",
      googleMobileClientId: "384292160153-2d4pq0661dcbcfghidsr9nf8rishqgf7.apps.googleusercontent.com",
      googleWebClientId: "384292160153-fjr11m8ao7ls43gshrh0i6pijgu6rfs1.apps.googleusercontent.com",
      assetPrefix: "./",
      eas: {
        projectId: "aa45cd69-a930-432f-a3ab-77a197e338b6",
      },
    },
    updates: {
      url: "https://u.expo.dev/aa45cd69-a930-432f-a3ab-77a197e338b6",
    },
    runtimeVersion: {
      policy: "appVersion",
    }
  },
};
