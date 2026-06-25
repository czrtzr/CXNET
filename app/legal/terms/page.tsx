import type { Metadata } from "next";
import { Section, P, List, LI, Term } from "@/components/legal/prose";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of CXNET.",
};

const EFFECTIVE = "June 24, 2026";

export default function TermsPage() {
  return (
    <>
      <div className="mb-10">
        <h1 className="font-serif text-3xl text-text">Terms of Service</h1>
        <p className="mt-2 text-xs uppercase tracking-[0.16em] text-text-faint">
          Effective {EFFECTIVE}
        </p>
      </div>

      <Section index={1} title="About CXNET">
        <P>
          CXNET is a private, invite-only wealth command center operated by{" "}
          <Term>Carter Feit</Term>, an individual based in Ontario, Canada
          (referred to here as <Term>we</Term>, <Term>us</Term>, or the{" "}
          <Term>operator</Term>). It lets you record and view your own financial
          information: accounts, balances, income, expenses, investments,
          assets, and liabilities. By accessing or using CXNET you agree to
          these Terms. If you do not agree, do not use the service.
        </P>
      </Section>

      <Section index={2} title="Eligibility and access">
        <P>
          Access is granted by invitation only. Your email address must be on
          the operator&rsquo;s allowlist before an account can be created, and
          we may add or remove access at our discretion. You must be at least
          the age of majority in your jurisdiction to use CXNET.
        </P>
        <P>
          You are responsible for the Google account you use to sign in and for
          all activity that occurs under your CXNET account. Do not share your
          access or let anyone else use your account.
        </P>
      </Section>

      <Section index={3} title="Acceptable use">
        <P>You agree not to:</P>
        <List>
          <LI>
            Attempt to access data belonging to any other user, or to bypass the
            invitation allowlist or any access control.
          </LI>
          <LI>
            Probe, scan, or test the vulnerability of the service, or interfere
            with its normal operation, without prior written permission.
          </LI>
          <LI>
            Use the service to store unlawful content, or use it in violation of
            any applicable law.
          </LI>
          <LI>
            Copy, resell, or redistribute the service or its underlying code.
          </LI>
        </List>
      </Section>

      <Section index={4} title="Your data">
        <P>
          You retain ownership of the financial information you enter. You grant
          us only the limited permission needed to store, process, and display
          that information back to you so the service can function. How we
          handle personal information is described in our{" "}
          <Term>Privacy Policy</Term> and <Term>Data &amp; Security</Term>{" "}
          notice.
        </P>
      </Section>

      <Section index={5} title="No financial advice">
        <P>
          CXNET is a record-keeping and visualization tool. Nothing in it is
          financial, investment, tax, accounting, or legal advice. Market prices
          and exchange rates are sourced from third parties, may be delayed or
          inaccurate, and are provided for information only. You are solely
          responsible for decisions you make based on what you see. Verify any
          figure that matters against an authoritative source.
        </P>
      </Section>

      <Section index={6} title="Availability and changes">
        <P>
          CXNET is provided on a personal, best-effort basis. We may change,
          suspend, or discontinue any part of it, and may modify these Terms, at
          any time. Material changes will be reflected by the effective date
          above. Continued use after a change means you accept the revised Terms.
        </P>
      </Section>

      <Section index={7} title="Disclaimer of warranties">
        <P>
          The service is provided <Term>&ldquo;as is&rdquo;</Term> and{" "}
          <Term>&ldquo;as available&rdquo;</Term>, without warranties of any
          kind, whether express or implied, including merchantability, fitness
          for a particular purpose, accuracy, and non-infringement. We do not
          warrant that the service will be uninterrupted, error-free, or secure,
          or that any data or figure shown is correct.
        </P>
      </Section>

      <Section index={8} title="Limitation of liability">
        <P>
          To the fullest extent permitted by law, the operator will not be
          liable for any indirect, incidental, special, consequential, or
          punitive damages, or for any loss of data, profits, or goodwill,
          arising from your use of or inability to use the service. Because CXNET
          is offered free of charge as a personal project, the operator&rsquo;s
          total aggregate liability is limited to one hundred Canadian dollars
          (CA$100).
        </P>
      </Section>

      <Section index={9} title="Termination">
        <P>
          You may stop using CXNET at any time and request deletion of your
          account. We may suspend or terminate your access if you breach these
          Terms or if we discontinue the service. On termination, your right to
          use the service ends; data handling on termination follows the Privacy
          Policy.
        </P>
      </Section>

      <Section index={10} title="Governing law">
        <P>
          These Terms are governed by the laws of the Province of Ontario and
          the federal laws of Canada applicable there, without regard to
          conflict-of-laws rules. The courts located in Ontario have exclusive
          jurisdiction over any dispute, subject to any non-waivable rights you
          have under the laws of your own country of residence.
        </P>
      </Section>

      <Section index={11} title="Contact">
        <P>
          Questions about these Terms can be sent to{" "}
          <a
            href="mailto:feitcarter@gmail.com"
            className="text-text underline decoration-border-strong underline-offset-4 transition hover:decoration-brass"
          >
            feitcarter@gmail.com
          </a>
          .
        </P>
      </Section>
    </>
  );
}
