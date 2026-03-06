import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useCart } from '../context/CartContext'
import { createOrder } from '../lib/ordersService'
import { createSumUpCheckout } from '../lib/sumup'
import { getShippingRates } from '../lib/shippingRatesService'
import { validateAddresses } from '../lib/addressValidationService'
import './Checkout.css'

const COUNTRY_OPTIONS = [
  { value: 'GB', label: 'United Kingdom' },
  { value: 'EU', label: 'European Union' },
  { value: 'OTHER', label: 'International (rest of world)' },
]

const UK_POSTCODE_REGEX = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}$/i

function validateCheckout({ email, confirmEmail, address, postcode, countryCode }) {
  const errors = []
  if (!email.trim()) errors.push('Email is required.')
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Please enter a valid email address.')
  if (email !== confirmEmail) errors.push('Email and confirmation do not match.')
  if (!address.trim()) errors.push('Address is required.')
  else if (address.trim().length < 10) errors.push('Please enter a full shipping address (at least 10 characters).')
  if (countryCode === 'GB' && postcode.trim() && !UK_POSTCODE_REGEX.test(postcode.replace(/\s/g, ''))) {
    errors.push('Please enter a valid UK postcode (e.g. SW1A 1AA).')
  }
  return errors
}

export default function Checkout() {
  const { cart, cartTotal, clearCart } = useCart()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [address, setAddress] = useState('')
  const [postcode, setPostcode] = useState('')
  const [countryCode, setCountryCode] = useState('GB')
  const [name, setName] = useState('')
  const [rates, setRates] = useState([])
  const [ratesLoading, setRatesLoading] = useState(false)
  const [ratesError, setRatesError] = useState(null)
  const [selectedRate, setSelectedRate] = useState(null)
  const shippingCost = selectedRate != null ? (Number(selectedRate.amount) ?? 0) : 0
  const orderTotal = (Number(cartTotal) || 0) + shippingCost
  const [sumUpLoading, setSumUpLoading] = useState(false)
  const [sumUpError, setSumUpError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState([])
  const [addressValidation, setAddressValidation] = useState(null)
  const [validatingAddress, setValidatingAddress] = useState(false)
  const [validationSkippedDueToPlan, setValidationSkippedDueToPlan] = useState(false)

  const addressIsValidated = addressValidation && (addressValidation.status === 'verified' || addressValidation.status === 'warning')
  const validationUnavailableDueToPlan = addressValidation?.status === 'error' && addressValidation?.code === 'VALIDATION_PLAN_REQUIRED'
  const canShowShippingRates = addressIsValidated || (validationSkippedDueToPlan && address.trim() && postcode.trim())
  const countryCodeForApi = countryCode === 'EU' ? 'FR' : countryCode === 'OTHER' ? 'US' : countryCode

  useEffect(() => {
    setAddressValidation(null)
    setValidationSkippedDueToPlan(false)
  }, [address, postcode, countryCode])

  useEffect(() => {
    if (!canShowShippingRates) {
      setRates([])
      setSelectedRate(null)
      setRatesError(null)
      setRatesLoading(false)
      return
    }
    const matched = addressValidation?.matched_address || addressValidation?.original_address
    const code = countryCode === 'EU' ? 'FR' : countryCode === 'OTHER' ? 'US' : countryCode
    setRatesLoading(true)
    setRatesError(null)
    getShippingRates({
      countryCode: matched?.country_code || code,
    })
      .then(({ rates: r }) => {
        setRates(r || [])
        setSelectedRate((prev) => {
          const same = r?.find((x) => x.id === prev?.id)
          return same || r?.[0] || null
        })
      })
      .catch((err) => {
        setRatesError(err.message)
        setRates([])
        setSelectedRate(null)
      })
      .finally(() => setRatesLoading(false))
  }, [countryCode, postcode, canShowShippingRates, addressValidation?.matched_address, addressValidation?.original_address])

  const handleValidateAddress = async () => {
    if (!address.trim() || !postcode.trim()) return
    setValidatingAddress(true)
    setAddressValidation(null)
    try {
      const { results } = await validateAddresses([{
        address_line1: address.trim(),
        postal_code: postcode.trim(),
        country_code: countryCodeForApi,
      }])
      const r = results[0]
      setAddressValidation(r ? { status: r.status, matched_address: r.matched_address, original_address: r.original_address, messages: r.messages || [] } : null)
    } catch (err) {
      setAddressValidation({ status: 'error', matched_address: null, original_address: null, messages: [err.message], code: err.code })
    } finally {
      setValidatingAddress(false)
    }
  }

  const applyMatchedAddress = () => {
    const m = addressValidation?.matched_address
    if (!m) return
    setAddress([m.address_line1, m.address_line2].filter(Boolean).join(', '))
    setPostcode(m.postal_code || postcode)
  }

  const handlePlaceOrderDemo = (e) => {
    e.preventDefault()
    setFieldErrors([])
    if (!addressIsValidated && !validationSkippedDueToPlan) {
      setFieldErrors(['Please validate your address before continuing.'])
      return
    }
    clearCart()
    navigate('/?order=success')
  }

  const handlePayWithSumUp = async (e) => {
    e.preventDefault()
    setSumUpError(null)
    setFieldErrors([])
    const errors = validateCheckout({ email, confirmEmail, address, postcode, countryCode })
    if (!addressIsValidated && !validationSkippedDueToPlan) errors.push('Please validate your address before continuing.')
    if (!selectedRate) errors.push('Please select a shipping method.')
    if (errors.length > 0) {
      setFieldErrors(errors)
      return
    }
    const emailVal = email.trim()
    const addressVal = [address.trim(), postcode.trim()].filter(Boolean).join(', ')
    setSumUpLoading(true)
    try {
      const { orderId } = await createOrder({
        email: emailVal,
        address: addressVal,
        name: name.trim() || undefined,
        shippingMethod: selectedRate ? `${selectedRate.carrier} – ${selectedRate.serviceName}` : 'Standard',
        shippingCost,
        items: cart.map((i) => ({
          id: i.id,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          size: i.size ?? 'One Size',
          image: i.image ?? '',
        })),
        total: orderTotal,
        currency: 'GBP',
      })
      const { hosted_checkout_url } = await createSumUpCheckout({
        amount: orderTotal,
        currency: 'GBP',
        checkout_reference: orderId,
        description: `Fan X Charms – ${cart.length} item(s)`,
        redirect_url: `${window.location.origin}/?order=success&orderId=${encodeURIComponent(orderId)}`,
      })
      clearCart()
      window.location.href = hosted_checkout_url
    } catch (err) {
      setSumUpError(err.message || 'Payment could not be started. Try the demo order or check the server.')
      setSumUpLoading(false)
    }
  }

  if (cart.length === 0) {
    return (
      <div className="checkout checkout--empty">
        <h2>No items to checkout</h2>
        <Link to="/">Continue shopping</Link>
      </div>
    )
  }

  return (
    <div className="checkout">
      <h2 className="checkout__title">Checkout</h2>
      <form className="checkout__form" onSubmit={(e) => e.preventDefault()}>
        <section className="checkout__section">
          <h3>Contact & shipping</h3>
          <p className="checkout__note">
            Enter your details. After payment you will be redirected back here.
          </p>
          <div className="checkout__field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="checkout__field">
            <label htmlFor="confirmEmail">Confirm email</label>
            <input
              id="confirmEmail"
              type="email"
              placeholder="Re-enter your email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="checkout__field">
            <label htmlFor="name">Name (optional)</label>
            <input
              id="name"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>
          <div className="checkout__field">
            <label htmlFor="address">Shipping address</label>
            <input
              id="address"
              type="text"
              placeholder="Street, city"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              autoComplete="street-address"
              minLength={10}
            />
          </div>
          <div className="checkout__field">
            <label htmlFor="country">Country / region</label>
            <select
              id="country"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="checkout__select"
              autoComplete="country"
            >
              {COUNTRY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="checkout__field">
            <label htmlFor="postcode">Postcode {countryCode === 'GB' ? '(optional for UK)' : '(optional)'}</label>
            <input
              id="postcode"
              type="text"
              placeholder={countryCode === 'GB' ? 'e.g. SW1A 1AA' : 'e.g. 12345'}
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              autoComplete="postal-code"
            />
          </div>
          <div className="checkout__field">
            <p className="checkout__validate-note">You must validate your address before placing an order.</p>
            <button
              type="button"
              className="checkout__validate-btn"
              onClick={handleValidateAddress}
              disabled={validatingAddress || !address.trim() || !postcode.trim()}
            >
              {validatingAddress ? 'Validating…' : 'Validate address'}
            </button>
            {addressValidation && (
              <div className={`checkout__validation checkout__validation--${addressValidation.status}`} role="status">
                <p className="checkout__validation-status">
                  {addressValidation.status === 'verified' && 'Address verified.'}
                  {addressValidation.status === 'warning' && 'Address validated with possible formatting changes.'}
                  {addressValidation.status === 'error' && 'Address could not be verified.'}
                  {addressValidation.status === 'unverified' && 'Pre-validation failed (check country/postcode format).'}
                </p>
                {addressValidation.matched_address && (
                  <button type="button" className="checkout__use-suggested" onClick={applyMatchedAddress}>
                    Use suggested address
                  </button>
                )}
                {addressValidation.messages?.length > 0 && (
                  <ul className="checkout__validation-messages">
                    {addressValidation.messages.map((msg, i) => (
                      <li key={i}>{typeof msg === 'object' ? msg.message || JSON.stringify(msg) : msg}</li>
                    ))}
                  </ul>
                )}
                {validationUnavailableDueToPlan && (
                  <button
                    type="button"
                    className="checkout__use-suggested checkout__continue-without-validation"
                    onClick={() => setValidationSkippedDueToPlan(true)}
                  >
                    Continue to shipping options
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="checkout__field">
            <label>Shipping method</label>
            {!canShowShippingRates && !ratesLoading && (
              <p className="checkout__rates-note">Validate your address above to see shipping options.</p>
            )}
            {ratesLoading && <p className="checkout__rates-loading">Loading rates…</p>}
            {ratesError && <p className="checkout__rates-error" role="alert">{ratesError}</p>}
            {!ratesLoading && canShowShippingRates && rates.length === 0 && !ratesError && (
              <p className="checkout__rates-note checkout__rates-empty" role="status">
                No shipping options available for this address. Please contact us for alternatives.
              </p>
            )}
            {!ratesLoading && rates.length > 0 && (
              <div className="checkout__rates" role="radiogroup" aria-label="Shipping method">
                {rates.map((rate) => (
                  <label key={rate.id} className="checkout__rate">
                    <input
                      type="radio"
                      name="shippingRate"
                      value={rate.id}
                      checked={selectedRate?.id === rate.id}
                      onChange={() => setSelectedRate(rate)}
                    />
                    <span className="checkout__rate-label">
                      {rate.carrier} – {rate.serviceName}
                      {rate.estimatedDays && ` (${rate.estimatedDays} days)`}
                    </span>
                    <span className="checkout__rate-amount">
                      {(Number(rate.amount) || 0) === 0 ? 'Free' : `£${(Number(rate.amount) || 0).toFixed(2)}`}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
          {fieldErrors.length > 0 && (
            <ul className="checkout__errors" role="alert">
              {fieldErrors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          )}
        </section>
        <section className="checkout__section checkout__order">
          <h3>Order summary</h3>
          <ul className="checkout__list">
            {cart.map((item) => (
              <li key={`${item.id}-${item.size}`}>
                <span>{item.name} × {item.quantity}</span>
                <span>£{((Number(item.price) || 0) * (Number(item.quantity) || 0)).toFixed(2)}</span>
              </li>
            ))}
          </ul>
          <p className="checkout__subtotal">
            Subtotal <strong>£{(Number(cartTotal) || 0).toFixed(2)}</strong>
          </p>
          <p className="checkout__shipping">
            Shipping <strong>£{(Number(shippingCost) || 0).toFixed(2)}</strong>
          </p>
          <p className="checkout__total">
            Total <strong>£{(Number(orderTotal) || 0).toFixed(2)}</strong>
          </p>

          {sumUpError && (
            <p className="checkout__error" role="alert">
              {sumUpError}
            </p>
          )}

          <button
            type="button"
            className="checkout__submit checkout__submit--sumup"
            onClick={handlePayWithSumUp}
            disabled={sumUpLoading || (!addressIsValidated && !validationSkippedDueToPlan) || !selectedRate}
          >
            {sumUpLoading ? 'Redirecting to payment…' : 'Pay with SumUp'}
          </button>
          <button
            type="button"
            className="checkout__submit checkout__submit--demo"
            onClick={handlePlaceOrderDemo}
            disabled={!addressIsValidated && !validationSkippedDueToPlan}
          >
            Place order (demo, no payment)
          </button>
        </section>
      </form>
    </div>
  )
}
