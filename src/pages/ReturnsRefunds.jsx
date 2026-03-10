import { CONTACT_EMAIL } from '../constants/site'
import './PolicyPage.css'

export default function ReturnsRefunds() {
  return (
    <div className="policy-page">
      <h1 className="policy-page__title">Returns & Refund Policy</h1>
      <p className="policy-page__updated">Last updated: March 2025</p>

      <section className="policy-page__section">
        <h2>Returns</h2>
        <p>
          We want you to be happy with your purchase. If you are not satisfied, you may return unused,
          unwashed items in their original packaging within <strong>14 days</strong> of delivery for a refund
          or exchange, subject to the conditions below.
        </p>
        <ul>
          <li>Items must be unused, in original condition and packaging where applicable.</li>
          <li>Proof of purchase (order confirmation or order reference) is required.</li>
          <li>
            You are responsible for the cost of return postage unless the item is faulty or we sent the
            wrong product. We will cover the postage cost when we send out any replacement items.
          </li>
          <li>
            Custom, mystery or otherwise personalised orders cannot be returned or exchanged unless the
            item is faulty.
          </li>
        </ul>
      </section>

      <section className="policy-page__section">
        <h2>How to return</h2>
        <p>
          Contact us with your order reference and reason for return. We will confirm whether your return
          is accepted and provide instructions for sending the item back. Once we receive and inspect the
          return, we will process your refund or send a replacement.
        </p>
      </section>

      <section className="policy-page__section">
        <h2>Refunds</h2>
        <p>
          Refunds will be made to the original payment method within <strong>14 days</strong> of us receiving
          the returned item. Delivery charges are non-refundable unless the return is due to our error or
          a faulty product. For payments made via Stripe, refunds are issued through the same channel.
        </p>
      </section>

      <section className="policy-page__section">
        <h2>Exchanges</h2>
        <p>
          If you need a different size or variant, please return the original item following the returns
          process and place a new order, or contact us to arrange an exchange where possible.
        </p>
      </section>

      <section className="policy-page__section">
        <h2>Faulty or incorrect items</h2>
        <p>
          If you receive a faulty item or we sent the wrong product, please contact us as soon as possible.
          We will cover the cost of return and arrange a full refund or replacement at no extra charge.
        </p>
      </section>

      <section className="policy-page__section">
        <h2>International orders, customs and shipping</h2>
        <p>
          Customers ordering for delivery outside of the UK are responsible for any local taxes payable,
          including VAT, and for any import duties, customs clearance fees and handling charges that may
          be applied once the goods reach the destination country. These fees are set by your local
          authorities; Fan X Charms has no control over them and cannot predict their amount.
        </p>
        <p>
          You will be the importer of record and are responsible for paying any import VAT, duty and
          customs charges, as well as any fees for import clearance. We recommend checking with your
          local customs office or postal service for more information before placing an order.
        </p>
        <p>
          For low-value orders (for example between £0.01 and £15.00) and some worldwide destinations,
          orders may be shipped without tracking. Where tracking is not available, we will still provide
          dispatch confirmation and estimated delivery timeframes, but detailed tracking updates may not
          be offered by the carrier.
        </p>
        <p>
          If the shipping address, email or phone number provided is incorrect and the package cannot be
          delivered, we are not able to offer a refund or replacement. If the parcel is returned to us
          as undeliverable, we will contact you to arrange redelivery to the correct address; additional
          postage costs for redelivery will be paid by you.
        </p>
      </section>

      <section className="policy-page__section">
        <h2>Contact</h2>
        <p>
          For returns and refund requests, email us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> or use the contact details on our website.
        </p>
      </section>
    </div>
  )
}
