const TermsPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-3xl rounded-xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800">Terms of Service</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: March 2026</p>

        <div className="mt-6 space-y-4 text-sm text-gray-700">
          <section>
            <h2 className="font-semibold text-gray-800">Acceptable Use</h2>
            <p>
              You agree to use PlatterOps lawfully and not attempt unauthorized access, abuse platform resources,
              or interfere with service availability.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-800">Account Responsibility</h2>
            <p>
              You are responsible for safeguarding account credentials and all activity performed through your account.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-800">Service Disclaimer</h2>
            <p>
              The platform is provided on an &quot;as is&quot; basis. While we aim for high availability, uninterrupted or error-free
              operation cannot be guaranteed.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-800">Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, PlatterOps is not liable for indirect, incidental, or consequential
              damages resulting from use of the service.
            </p>
          </section>

          <p className="rounded-md bg-yellow-50 px-3 py-2 text-xs text-yellow-700">
            Placeholder terms text: consult a qualified legal professional before production launch.
          </p>
        </div>
      </div>
    </div>
  )
}

export default TermsPage
