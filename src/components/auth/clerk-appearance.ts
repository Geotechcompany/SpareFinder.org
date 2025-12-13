export const authClerkAppearance = {
  elements: {
    /**
     * Hides the default Clerk footer ("Secured by Clerk").
     * This keeps your custom auth page UI consistent.
     */
    footer: "hidden",

    /**
     * Remove Clerk's own white card so it blends into our AuthShell card.
     */
    rootBox: "w-full",
    cardBox: "bg-transparent shadow-none border-0 p-0",
    card: "bg-transparent shadow-none border-0 p-0",
    main: "p-0",
  },
};


