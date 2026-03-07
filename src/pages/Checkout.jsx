import { Link, useSearchParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useCart } from '../context/CartContext'
import { createOrder } from '../lib/ordersService'
import { createStripeCheckout } from '../lib/stripeCheckout'
import { getShippingRates } from '../lib/shippingRatesService'
import { validateAddresses } from '../lib/addressValidationService'
import { CONTACT_EMAIL } from '../constants/site'
import './Checkout.css'

const COUNTRY_OPTIONS = [
  { value: 'GB', label: 'United Kingdom' },
  { value: 'INTL', label: 'International' },
]

// Countries for International shipping (excluding UK). Sorted by name.
const INTERNATIONAL_COUNTRIES = [
  { value: 'AF', label: 'Afghanistan' }, { value: 'AL', label: 'Albania' }, { value: 'DZ', label: 'Algeria' }, { value: 'AD', label: 'Andorra' }, { value: 'AO', label: 'Angola' },
  { value: 'AG', label: 'Antigua and Barbuda' }, { value: 'AR', label: 'Argentina' }, { value: 'AM', label: 'Armenia' }, { value: 'AU', label: 'Australia' }, { value: 'AT', label: 'Austria' },
  { value: 'AZ', label: 'Azerbaijan' }, { value: 'BS', label: 'Bahamas' }, { value: 'BH', label: 'Bahrain' }, { value: 'BD', label: 'Bangladesh' }, { value: 'BB', label: 'Barbados' },
  { value: 'BY', label: 'Belarus' }, { value: 'BE', label: 'Belgium' }, { value: 'BZ', label: 'Belize' }, { value: 'BJ', label: 'Benin' }, { value: 'BT', label: 'Bhutan' },
  { value: 'BO', label: 'Bolivia' }, { value: 'BA', label: 'Bosnia and Herzegovina' }, { value: 'BW', label: 'Botswana' }, { value: 'BR', label: 'Brazil' }, { value: 'BN', label: 'Brunei' },
  { value: 'BG', label: 'Bulgaria' }, { value: 'BF', label: 'Burkina Faso' }, { value: 'BI', label: 'Burundi' }, { value: 'KH', label: 'Cambodia' }, { value: 'CM', label: 'Cameroon' },
  { value: 'CA', label: 'Canada' }, { value: 'CV', label: 'Cape Verde' }, { value: 'CF', label: 'Central African Republic' }, { value: 'TD', label: 'Chad' }, { value: 'CL', label: 'Chile' },
  { value: 'CN', label: 'China' }, { value: 'CO', label: 'Colombia' }, { value: 'KM', label: 'Comoros' }, { value: 'CG', label: 'Congo' }, { value: 'CR', label: 'Costa Rica' },
  { value: 'HR', label: 'Croatia' }, { value: 'CU', label: 'Cuba' }, { value: 'CY', label: 'Cyprus' }, { value: 'CZ', label: 'Czech Republic' }, { value: 'DK', label: 'Denmark' },
  { value: 'DJ', label: 'Djibouti' }, { value: 'DM', label: 'Dominica' }, { value: 'DO', label: 'Dominican Republic' }, { value: 'EC', label: 'Ecuador' }, { value: 'EG', label: 'Egypt' },
  { value: 'SV', label: 'El Salvador' }, { value: 'GQ', label: 'Equatorial Guinea' }, { value: 'ER', label: 'Eritrea' }, { value: 'EE', label: 'Estonia' }, { value: 'ET', label: 'Ethiopia' },
  { value: 'FJ', label: 'Fiji' }, { value: 'FI', label: 'Finland' }, { value: 'FR', label: 'France' }, { value: 'GA', label: 'Gabon' }, { value: 'GM', label: 'Gambia' },
  { value: 'GE', label: 'Georgia' }, { value: 'DE', label: 'Germany' }, { value: 'GH', label: 'Ghana' }, { value: 'GR', label: 'Greece' }, { value: 'GD', label: 'Grenada' },
  { value: 'GT', label: 'Guatemala' }, { value: 'GN', label: 'Guinea' }, { value: 'GW', label: 'Guinea-Bissau' }, { value: 'GY', label: 'Guyana' }, { value: 'HT', label: 'Haiti' },
  { value: 'HN', label: 'Honduras' }, { value: 'HK', label: 'Hong Kong' }, { value: 'HU', label: 'Hungary' }, { value: 'IS', label: 'Iceland' }, { value: 'IN', label: 'India' },
  { value: 'ID', label: 'Indonesia' }, { value: 'IR', label: 'Iran' }, { value: 'IQ', label: 'Iraq' }, { value: 'IE', label: 'Ireland' }, { value: 'IL', label: 'Israel' },
  { value: 'IT', label: 'Italy' }, { value: 'JM', label: 'Jamaica' }, { value: 'JP', label: 'Japan' }, { value: 'JO', label: 'Jordan' }, { value: 'KZ', label: 'Kazakhstan' },
  { value: 'KE', label: 'Kenya' }, { value: 'KW', label: 'Kuwait' }, { value: 'KG', label: 'Kyrgyzstan' }, { value: 'LA', label: 'Laos' }, { value: 'LV', label: 'Latvia' },
  { value: 'LB', label: 'Lebanon' }, { value: 'LS', label: 'Lesotho' }, { value: 'LR', label: 'Liberia' }, { value: 'LY', label: 'Libya' }, { value: 'LI', label: 'Liechtenstein' },
  { value: 'LT', label: 'Lithuania' }, { value: 'LU', label: 'Luxembourg' }, { value: 'MO', label: 'Macau' }, { value: 'MG', label: 'Madagascar' }, { value: 'MW', label: 'Malawi' },
  { value: 'MY', label: 'Malaysia' }, { value: 'MV', label: 'Maldives' }, { value: 'ML', label: 'Mali' }, { value: 'MT', label: 'Malta' }, { value: 'MR', label: 'Mauritania' },
  { value: 'MU', label: 'Mauritius' }, { value: 'MX', label: 'Mexico' }, { value: 'MD', label: 'Moldova' }, { value: 'MC', label: 'Monaco' }, { value: 'MN', label: 'Mongolia' },
  { value: 'ME', label: 'Montenegro' }, { value: 'MA', label: 'Morocco' }, { value: 'MZ', label: 'Mozambique' }, { value: 'MM', label: 'Myanmar' }, { value: 'NA', label: 'Namibia' },
  { value: 'NP', label: 'Nepal' }, { value: 'NL', label: 'Netherlands' }, { value: 'NZ', label: 'New Zealand' }, { value: 'NI', label: 'Nicaragua' }, { value: 'NE', label: 'Niger' },
  { value: 'NG', label: 'Nigeria' }, { value: 'MK', label: 'North Macedonia' }, { value: 'NO', label: 'Norway' }, { value: 'OM', label: 'Oman' }, { value: 'PK', label: 'Pakistan' },
  { value: 'PA', label: 'Panama' }, { value: 'PG', label: 'Papua New Guinea' }, { value: 'PY', label: 'Paraguay' }, { value: 'PE', label: 'Peru' }, { value: 'PH', label: 'Philippines' },
  { value: 'PL', label: 'Poland' }, { value: 'PT', label: 'Portugal' }, { value: 'QA', label: 'Qatar' }, { value: 'RO', label: 'Romania' }, { value: 'RU', label: 'Russia' },
  { value: 'RW', label: 'Rwanda' }, { value: 'SA', label: 'Saudi Arabia' }, { value: 'SN', label: 'Senegal' }, { value: 'RS', label: 'Serbia' }, { value: 'SG', label: 'Singapore' },
  { value: 'SK', label: 'Slovakia' }, { value: 'SI', label: 'Slovenia' }, { value: 'SO', label: 'Somalia' }, { value: 'ZA', label: 'South Africa' }, { value: 'KR', label: 'South Korea' },
  { value: 'SS', label: 'South Sudan' }, { value: 'ES', label: 'Spain' }, { value: 'LK', label: 'Sri Lanka' }, { value: 'SD', label: 'Sudan' }, { value: 'SR', label: 'Suriname' },
  { value: 'SE', label: 'Sweden' }, { value: 'CH', label: 'Switzerland' }, { value: 'TW', label: 'Taiwan' }, { value: 'TZ', label: 'Tanzania' }, { value: 'TH', label: 'Thailand' },
  { value: 'TL', label: 'Timor-Leste' }, { value: 'TG', label: 'Togo' }, { value: 'TT', label: 'Trinidad and Tobago' }, { value: 'TN', label: 'Tunisia' }, { value: 'TR', label: 'Turkey' },
  { value: 'UG', label: 'Uganda' }, { value: 'UA', label: 'Ukraine' }, { value: 'AE', label: 'United Arab Emirates' }, { value: 'US', label: 'United States' }, { value: 'UY', label: 'Uruguay' },
  { value: 'UZ', label: 'Uzbekistan' }, { value: 'VE', label: 'Venezuela' }, { value: 'VN', label: 'Vietnam' }, { value: 'YE', label: 'Yemen' }, { value: 'ZM', label: 'Zambia' }, { value: 'ZW', label: 'Zimbabwe' },
]

const UK_POSTCODE_REGEX = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}$/i

function validateCheckout({ email, confirmEmail, name, addressLine1, city, postcode, countryCode, internationalCountry }) {
  const errors = []
  if (!email.trim()) errors.push('Please enter your email address.')
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Please double-check your email address—it doesn’t look right.')
  if (email !== confirmEmail) errors.push('Your email and confirmation don’t match. Please check both and try again.')
  if (!name.trim()) errors.push('Please enter your name so we know who to send the order to.')
  if (!addressLine1.trim()) errors.push('Please enter your street address.')
  else if (addressLine1.trim().length < 5) errors.push('Please enter a full street address (at least 5 characters).')
  if (!city.trim()) errors.push('Please enter your city or town.')
  if (countryCode === 'INTL' && !internationalCountry) errors.push('Please choose your country from the list.')
  if (!postcode.trim()) errors.push(countryCode === 'GB' ? 'Please enter your postcode.' : 'Please enter your postcode or ZIP code.')
  else if (countryCode === 'GB' && !UK_POSTCODE_REGEX.test(postcode.replace(/\s/g, ''))) {
    errors.push('That doesn’t look like a valid UK postcode (e.g. SW1A 1AA). Please check and try again.')
  }
  return errors
}

export default function Checkout() {
  const { cart, cartTotal, clearCart } = useCart()
  const [searchParams, setSearchParams] = useSearchParams()
  const canceled = searchParams.get('canceled') === '1'
  const [email, setEmail] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [name, setName] = useState('')
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [city, setCity] = useState('')
  const [postcode, setPostcode] = useState('')
  const [countryCode, setCountryCode] = useState('GB')
  const [internationalCountry, setInternationalCountry] = useState('')
  const [rates, setRates] = useState([])
  const [ratesLoading, setRatesLoading] = useState(false)
  const [ratesError, setRatesError] = useState(null)
  const [selectedRate, setSelectedRate] = useState(null)
  const shippingCost = selectedRate != null ? (Number(selectedRate.amount) ?? 0) : 0
  const orderTotal = (Number(cartTotal) || 0) + shippingCost
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState([])
  const [addressValidation, setAddressValidation] = useState(null)
  const [validatingAddress, setValidatingAddress] = useState(false)
  const [validationSkippedDueToPlan, setValidationSkippedDueToPlan] = useState(false)

  const addressIsValidated = addressValidation && (addressValidation.status === 'verified' || addressValidation.status === 'warning')
  const validationUnavailableDueToPlan = addressValidation?.status === 'error' && addressValidation?.code === 'VALIDATION_PLAN_REQUIRED'
  const canShowShippingRates = addressIsValidated || (validationSkippedDueToPlan && addressLine1.trim() && city.trim() && postcode.trim() && (countryCode === 'GB' || internationalCountry))
  const countryCodeForApi = countryCode === 'INTL' ? (internationalCountry || 'US') : countryCode

  useEffect(() => {
    setAddressValidation(null)
    setValidationSkippedDueToPlan(false)
  }, [addressLine1, addressLine2, city, postcode, countryCode, internationalCountry])

  useEffect(() => {
    if (!canShowShippingRates) {
      setRates([])
      setSelectedRate(null)
      setRatesError(null)
      setRatesLoading(false)
      return
    }
    const matched = addressValidation?.matched_address || addressValidation?.original_address
    const code = countryCode === 'INTL' ? (internationalCountry || 'US') : countryCode
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
  }, [countryCode, internationalCountry, postcode, canShowShippingRates, addressValidation?.matched_address, addressValidation?.original_address])

  const handleValidateAddress = async () => {
    if (!addressLine1.trim() || !postcode.trim()) return
    setValidatingAddress(true)
    setAddressValidation(null)
    try {
      const { results } = await validateAddresses([{
        address_line1: addressLine1.trim(),
        address_line2: addressLine2.trim() || undefined,
        city_locality: city.trim() || undefined,
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
    setAddressLine1(m.address_line1 || addressLine1)
    setAddressLine2(m.address_line2 || addressLine2)
    setCity(m.city_locality || m.city || city)
    setPostcode(m.postal_code || postcode)
  }

  const handlePayWithStripe = async (e) => {
    e.preventDefault()
    setPaymentError(null)
    setFieldErrors([])
    const errors = validateCheckout({ email, confirmEmail, name, addressLine1, city, postcode, countryCode, internationalCountry })
    if (!addressIsValidated && !validationSkippedDueToPlan) errors.push('Please validate your address above so we can show shipping options.')
    if (!selectedRate) errors.push('Please choose a shipping method.')
    if (errors.length > 0) {
      setFieldErrors(errors)
      return
    }
    const emailVal = email.trim()
    const countryLabel = countryCode === 'GB' ? 'United Kingdom' : INTERNATIONAL_COUNTRIES.find((c) => c.value === internationalCountry)?.label || internationalCountry || 'International'
    const addressVal = [addressLine1.trim(), addressLine2.trim(), city.trim(), postcode.trim(), countryLabel].filter(Boolean).join(', ')
    setPaymentLoading(true)
    try {
      const { orderId } = await createOrder({
        email: emailVal,
        address: addressVal,
        name: name.trim(),
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
      const { url } = await createStripeCheckout({
        amount: orderTotal,
        currency: 'gbp',
        orderId,
        description: `Fan X Charms – ${cart.length} item(s)`,
        success_url: `${window.location.origin}/?order=success&orderId=${encodeURIComponent(orderId)}`,
        cancel_url: `${window.location.origin}/checkout?canceled=1`,
      })
      window.location.href = url
    } catch (err) {
      setPaymentError(err.message || 'We couldn’t start payment right now. Please try again in a moment.')
      setPaymentLoading(false)
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
      {canceled && (
        <div className="checkout__canceled-notice" role="status">
          <p><strong>Payment was canceled.</strong> Your items are still in your cart—you can proceed to payment again when you&apos;re ready or <Link to="/shop">continue shopping</Link>.</p>
          <button type="button" className="checkout__dismiss-canceled" onClick={() => setSearchParams({})} aria-label="Dismiss">×</button>
        </div>
      )}
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
            <label htmlFor="name">Name</label>
            <input
              id="name"
              type="text"
              placeholder="Your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>
          <div className="checkout__field">
            <label htmlFor="addressLine1">Address line 1</label>
            <input
              id="addressLine1"
              type="text"
              placeholder="Street address"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              required
              autoComplete="address-line1"
              minLength={5}
            />
          </div>
          <div className="checkout__field">
            <label htmlFor="addressLine2">Address line 2 <span className="checkout__optional">(optional)</span></label>
            <input
              id="addressLine2"
              type="text"
              placeholder="Flat, building, etc."
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              autoComplete="address-line2"
            />
          </div>
          <div className="checkout__field">
            <label htmlFor="city">City / town</label>
            <input
              id="city"
              type="text"
              placeholder="City or town"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
              autoComplete="address-level2"
            />
          </div>
          <div className="checkout__field">
            <label htmlFor="country">Region</label>
            <select
              id="country"
              value={countryCode}
              onChange={(e) => {
                setCountryCode(e.target.value)
                if (e.target.value !== 'INTL') setInternationalCountry('')
              }}
              className="checkout__select"
              autoComplete="country"
            >
              {COUNTRY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {countryCode === 'INTL' && (
            <div className="checkout__field">
              <label htmlFor="internationalCountry">Country</label>
              <select
                id="internationalCountry"
                value={internationalCountry}
                onChange={(e) => setInternationalCountry(e.target.value)}
                className="checkout__select"
                required={countryCode === 'INTL'}
                autoComplete="country-name"
              >
                <option value="">Select your country</option>
                {INTERNATIONAL_COUNTRIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          )}
          <div className="checkout__field">
            <label htmlFor="postcode">{countryCode === 'GB' ? 'Postcode' : 'Postcode / ZIP code'}</label>
            <input
              id="postcode"
              type="text"
              placeholder={countryCode === 'GB' ? 'e.g. SW1A 1AA' : 'e.g. 12345'}
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              required
              autoComplete="postal-code"
            />
          </div>
          <div className="checkout__field">
            <p className="checkout__validate-note">Click “Validate address” below so we can confirm your details and show shipping options.</p>
            <button
              type="button"
              className="checkout__validate-btn"
              onClick={handleValidateAddress}
              disabled={validatingAddress || !addressLine1.trim() || !city.trim() || !postcode.trim() || (countryCode === 'INTL' && !internationalCountry)}
            >
              {validatingAddress ? 'Validating…' : 'Validate address'}
            </button>
            {addressValidation && (
              <div className={`checkout__validation checkout__validation--${addressValidation.status}`} role="status">
                <p className="checkout__validation-status">
                  {addressValidation.status === 'verified' && 'Address verified—you’re good to go.'}
                  {addressValidation.status === 'warning' && 'Address checked. We’ve suggested a small formatting change you can apply if you like.'}
                  {addressValidation.status === 'error' && 'We couldn’t verify this address. Please check the details and try again.'}
                  {addressValidation.status === 'unverified' && 'Please check your country and postcode or ZIP code and try again.'}
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
                    I’ll continue without address validation
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="checkout__field">
            <label>Shipping method</label>
            {!canShowShippingRates && !ratesLoading && (
              <p className="checkout__rates-note">Validate your address above and we’ll show you shipping options.</p>
            )}
            {ratesLoading && <p className="checkout__rates-loading">Loading rates…</p>}
            {ratesError && <p className="checkout__rates-error" role="alert">{ratesError}</p>}
            {!ratesLoading && canShowShippingRates && rates.length === 0 && !ratesError && (
              <p className="checkout__rates-note checkout__rates-empty" role="status">
                We don’t have shipping options for this address yet. Get in touch at {CONTACT_EMAIL} and we’ll help you out.
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
          <p className="checkout__tax-note">All prices include tax.</p>

          <p className="checkout__payment-note">
            Your order is only confirmed after payment is complete. You&apos;ll be redirected to our secure payment page.
          </p>
          {paymentError && (
            <p className="checkout__error" role="alert">
              {paymentError}
            </p>
          )}

          <button
            type="button"
            className="checkout__submit checkout__submit--stripe"
            onClick={handlePayWithStripe}
            disabled={paymentLoading || (!addressIsValidated && !validationSkippedDueToPlan) || !selectedRate || (countryCode === 'INTL' && !internationalCountry)}
          >
            {paymentLoading ? 'Redirecting to checkout…' : 'Proceed to payment'}
          </button>
        </section>
      </form>
    </div>
  )
}
