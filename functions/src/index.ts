import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import TwitterApi from "twitter-api-v2";

admin.initializeApp();

const dbRef = admin.firestore().doc("tokens/main");
const twitterClient = new TwitterApi({
  clientId: `${process.env.TWITTER_CLIENT_ID}`,
  clientSecret: `${process.env.TWITTER_CLIENT_SECRET}`,
});

const CallbackURL =
  "http://127.0.0.1:5001/twitter-memes-bot/us-central1/callback";

export const auth = functions.https.onRequest(async (request, response) => {
  const { url, codeVerifier, state } = twitterClient.generateOAuth2AuthLink(
    CallbackURL,
    {
      scope: ["tweet.read", "tweet.write", "users.read", "offline.access"],
    }
  );
  await dbRef.set({ codeVerifier, state });

  response.redirect(url);
});

export const callback = functions.https.onRequest(async (request, response) => {
  const { code, state } = request.query;
  const dbSnapshot = await dbRef.get();
  const { codeVerifier, state: storedState }: any = dbSnapshot.data();

  if (state !== storedState) {
    throw new Error("State mismatch");
  }

  const {
    // client: loggedClient,
    accessToken,
    refreshToken,
  } = await twitterClient.loginWithOAuth2({
    code: code as string,
    codeVerifier,
    redirectUri: CallbackURL,
  });

  await dbRef.set({ accessToken, refreshToken });

  response.sendStatus(200);
});

export const tweet = functions.https.onRequest((request, response) => {});
