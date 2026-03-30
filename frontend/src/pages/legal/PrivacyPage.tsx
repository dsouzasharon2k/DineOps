const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-3xl rounded-xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800">Privacy Policy</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: March 2026</p>

        <div className="mt-6 space-y-4 text-sm text-gray-700">
          <section>
            <h2 className="font-semibold text-gray-800">Data Collected</h2>
            <p>
              We may collect account details, contact information, order details, and operational usage data
              required to run the PlatterOps platform.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-800">Purpose of Processing</h2>
            <p>
              Data is used for authentication, order processing, restaurant operations, analytics, support,
              and platform security.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-800">Retention</h2>
            <p>
              We retain data only as long as necessary for service delivery, legal obligations, and audit requirements.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-800">Third-Party Sharing</h2>
            <p>
              We may share limited data with infrastructure and communication providers (for hosting, email, SMS,
              and monitoring) under contractual safeguards.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-800">Your Rights</h2>
            <p>
              Depending on applicable law, you may request access, correction, deletion, and restriction of your data.
              Contact your organization admin or support for requests.
            </p>
          </section>

          <p className="rounded-md bg-yellow-50 px-3 py-2 text-xs text-yellow-700">
            Placeholder policy text: consult a qualified legal professional before production launch.
          </p>
        </div>
      </div>
    </div>
  )
}

export default PrivacyPage
