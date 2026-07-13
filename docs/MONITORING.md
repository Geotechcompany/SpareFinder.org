# Production monitoring

Use an independent monitor so outage alerts still work when SpareFinder is unavailable.

## Better Stack Uptime setup

1. Create two HTTP monitors with a 60-second interval:
   - `https://sparefinder.org/`
   - `https://aiagent-sparefinder-org.onrender.com/health`
2. Configure both monitors to alert on downtime and recovery.
3. Add `email@sparefinder.org` and `tps@tpsinternational.co.uk` as alert recipients.
4. Create a public Better Stack status page and add its URL to the monitor descriptions or customer communications.

The external monitor covers availability. The application sends throttled exception alerts through `ERROR_NOTIFY_EMAIL` and exposes manually managed incident updates at `/status`.
