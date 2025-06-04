export default {
  expo: {
    name: "pool-hall-waitlist",
    slug: "pool-hall-waitlist",
    version: "1.0.0",
    sdkVersion: "50.0.0",
    platforms: ["ios", "android", "web"],
    extra: {
      apiBaseUrl: "https://pool-hall-waitlist-3b8c64cbf25d.herokuapp.com",
      assetPrefix: "./"
    },
    eas: {
      projectId: "aa45cd69-a930-432f-a3ab-77a197e338b6"
    },
    updates: {
      url: "https://u.expo.dev/aa45cd69-a930-432f-a3ab-77a197e338b6"
    },
    runtimeVersion: {
      policy: "appVersion"
    },
    web: {
      bundler: "webpack"
    }
  }
};
