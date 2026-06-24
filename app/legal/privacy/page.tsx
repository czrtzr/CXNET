import type { Metadata } from "next";
import { Section, P, List, LI, Term } from "@/components/legal/prose";

export const metadata: Metadata = {
  title: "Privacy Policy — CXNET",
  description: "What personal information CXNET collects and how it is used.",
};

const EFFECTIVE = "June 24, 2026";

export default function PrivacyPage() {
  return (
    <>
      <div className="mb-10">
        <h1 className="font-serif text-3xl text-text">Privacy Policy</h1>
        <p className="mt-2 text-xs uppercase tracking-[0.16em] text-text-faint">
          Effective {EFFECTIVE}
        </p>
      </div>

      <Section index={1} title="Who is responsible">
        <P>
          CXNET is operated by <Term>Carter Feit</Term>, an individual based in
          Ontario, Canada, who acts as the data controller for the personal
          information described below. This policy explains what we collect, why,
          how it is protected, and the choices you have. It is written to align
          with Canada&rsquo;s <Term>PIPEDA</Term> and, for users in the European
          Economic Area and the United Kingdom, the <Term>GDPR</Term>.
        </P>
      </Section>

      <Section index={2} title="Information we collect">
        <P>We collect only what the service needs to work:</P>
        <List>
          <LI>
            <Term>Account identity.</Term> When you sign in with Google, we
            receive your email address and basic profile details (such as your
            name and avatar) from Google. We do not see or store your Google
            password.
          </LI>
          <LI>
            <Term>Financial information you enter.</Term> The accounts, balances,
            income, expenses, investments, assets, liabilities, and notes you
            add. This is provided by you and stored so the service can show it
            back to you.
          </LI>
          <LI>
            <Term>Operational data.</Term> Minimal technical information needed
            to run and secure the service, such as session cookies and standard
            server logs. We do not use advertising or third-party analytics
            trackers.
          </LI>
        </List>
      </Section>

      <Section index={3} title="How we use it">
        <List>
          <LI>To authenticate you and keep you signed in.</LI>
          <LI>
            To store, organize, and display your financial records and the
            charts derived from them.
          </LI>
          <LI>
            To enforce the invitation allowlist so the service stays private.
          </LI>
          <LI>To operate, secure, debug, and maintain the service.</LI>
        </List>
        <P>
          We do not sell your personal information, and we do not use your
          financial data for advertising or to train any machine-learning model.
        </P>
      </Section>

      <Section index={4} title="Legal bases (EEA / UK users)">
        <P>
          Where the GDPR applies, we rely on the following legal bases:{" "}
          <Term>performance of a contract</Term> (providing the service you
          asked for), <Term>consent</Term> (which you may withdraw at any time),
          and <Term>legitimate interests</Term> (keeping the service secure and
          functioning). You can object to processing based on legitimate
          interests as described below.
        </P>
      </Section>

      <Section index={5} title="Service providers we rely on">
        <P>
          We use a small number of processors to run CXNET. They handle data only
          on our instructions:
        </P>
        <List>
          <LI>
            <Term>Supabase</Term> — database, authentication, and storage of your
            account and financial data.
          </LI>
          <LI>
            <Term>Vercel</Term> — application hosting and delivery.
          </LI>
          <LI>
            <Term>Google</Term> — sign-in (OAuth). Google&rsquo;s handling of
            your account is governed by its own privacy policy.
          </LI>
          <LI>
            <Term>Yahoo Finance</Term> and <Term>frankfurter.dev (ECB)</Term> —
            market prices and exchange rates. These requests are made by our
            servers and do not include your personal information.
          </LI>
        </List>
      </Section>

      <Section index={6} title="International transfers">
        <P>
          Our providers may process or store data outside your country,
          including in the United States. Where required, such transfers rely on
          appropriate safeguards (for example, standard contractual clauses) put
          in place by those providers.
        </P>
      </Section>

      <Section index={7} title="Retention">
        <P>
          We keep your information for as long as your account is active. When
          you ask us to delete your account, we remove your financial records
          and profile, except where we must retain limited information to comply
          with a legal obligation or to resolve disputes. Backups are purged on a
          rolling basis.
        </P>
      </Section>

      <Section index={8} title="Your rights">
        <P>
          You can ask us to do the following with your personal information:
        </P>
        <List>
          <LI>Access a copy of it, or export your records.</LI>
          <LI>Correct anything inaccurate.</LI>
          <LI>Delete your account and the data tied to it.</LI>
          <LI>Withdraw consent or object to certain processing.</LI>
          <LI>
            Lodge a complaint with a supervisory authority — the Office of the
            Privacy Commissioner of Canada, or your local EEA/UK regulator.
          </LI>
        </List>
        <P>
          To exercise any of these, email{" "}
          <a
            href="mailto:feitcarter@gmail.com"
            className="text-text underline decoration-border-strong underline-offset-4 transition hover:decoration-brass"
          >
            feitcarter@gmail.com
          </a>
          . We respond within the time required by applicable law.
        </P>
      </Section>

      <Section index={9} title="Cookies">
        <P>
          CXNET sets only the cookies needed to keep you signed in and to secure
          your session. There are no advertising or cross-site tracking cookies.
        </P>
      </Section>

      <Section index={10} title="Children">
        <P>
          CXNET is not intended for anyone under the age of majority in their
          jurisdiction, and we do not knowingly collect their information.
        </P>
      </Section>

      <Section index={11} title="Changes and contact">
        <P>
          We will update this policy as the service evolves and will revise the
          effective date above. For any privacy question or request, contact{" "}
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
