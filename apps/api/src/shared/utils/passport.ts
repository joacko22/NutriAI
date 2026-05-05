import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { config }      from '../../config';
import { authService } from '../../modules/auth/auth.service';

if (config.google.clientId && config.google.clientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID:     config.google.clientId,
        clientSecret: config.google.clientSecret,
        callbackURL:  config.google.callbackUrl,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error('No se obtuvo email de Google'), false);

          const result = await authService.findOrCreateGoogleUser({
            id:          profile.id,
            email,
            displayName: profile.displayName,
          });

          return done(null, result as unknown as Express.User);
        } catch (err) {
          return done(err as Error, false);
        }
      },
    ),
  );
}

export { passport };
