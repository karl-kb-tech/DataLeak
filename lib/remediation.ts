// Plain-English remediation guidance. Pure functions so the same copy drives
// both the on-screen results and the downloadable PDF. Written for
// non-technical users (no jargon): every finding pairs with a concrete step.

export interface Remediation {
  /** One-line summary of what was found. */
  headline: string
  /** Ordered, plain-English next steps. */
  steps: string[]
}

export function passwordRemediation(pwned: boolean, count: number): Remediation {
  if (!pwned) {
    return {
      headline: "Good news — this password wasn't found in known breaches.",
      steps: [
        'Keep using a different, strong password for every account.',
        'A password manager can create and remember these for you.',
      ],
    }
  }
  const times = count.toLocaleString('en-NZ')
  return {
    headline: `This password has appeared ${times} time${count === 1 ? '' : 's'} in known data breaches.`,
    steps: [
      'Stop using this password anywhere you currently use it.',
      'Change it on every account where you used it, starting with email and banking.',
      'Use a unique password for each account — a password manager makes this easy.',
      'Turn on two-factor authentication wherever it is offered.',
    ],
  }
}

export function breachRemediation(breachCount: number): Remediation {
  if (breachCount === 0) {
    return {
      headline: "We didn't find this email in the breaches we checked.",
      steps: [
        'This is not a guarantee — not every breach is public.',
        'Use a unique password per account and turn on two-factor authentication.',
      ],
    }
  }
  return {
    headline: `This email appears in ${breachCount} known data breach${breachCount === 1 ? '' : 'es'}.`,
    steps: [
      'Change the password on each affected service, and anywhere you reused it.',
      'Turn on two-factor authentication on those accounts.',
      'Be alert to scam emails that reference these services — breached data is used for phishing.',
    ],
  }
}

export function infectionRemediation(infected: boolean): Remediation {
  if (!infected) {
    return {
      headline: "We didn't find this in known info-stealer malware logs.",
      steps: [
        'This only covers infections that have been collected — it is not a clean bill of health.',
        'Keep devices updated, run trusted security software, and be wary of pirated or cracked downloads.',
        'Use a unique password per account and turn on two-factor authentication.',
      ],
    }
  }
  return {
    headline:
      'A device that signed into your accounts was infected by password-stealing malware.',
    steps: [
      'Run a full antivirus or anti-malware scan on your devices, and remove anything it finds.',
      'From a device you trust is clean, change your passwords — start with email and banking.',
      'Turn on two-factor authentication everywhere it is offered.',
      'Look at the partly-hidden passwords shown below — if you recognise one, change it everywhere you used it.',
      'Avoid pirated software and suspicious downloads; that is how these infections usually spread.',
    ],
  }
}

export function usernameRemediation(hitCount: number): Remediation {
  if (hitCount === 0) {
    return {
      headline: "We didn't find public profiles for this username.",
      steps: [
        'This only covers the platforms we checked — others may still exist.',
        'Review the privacy settings on accounts you do use.',
      ],
    }
  }
  return {
    headline: `This username is publicly visible on ${hitCount} platform${hitCount === 1 ? '' : 's'}.`,
    steps: [
      'Review each profile and remove personal details you would rather keep private.',
      'Set profiles you no longer use to private, or close them.',
      'Avoid reusing the same username across unrelated accounts — it links them together.',
    ],
  }
}
