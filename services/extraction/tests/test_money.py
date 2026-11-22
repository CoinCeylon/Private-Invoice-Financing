from datetime import date

from app.money import detect_currency, format_minor, parse_amount, parse_date


def test_parse_amounts():
    assert parse_amount("Total LKR 120,000.00") == 12_000_000
    assert parse_amount("Rs. 45,500/=") == 4_550_000
    assert parse_amount("USD 2,500") == 250_000
    assert parse_amount("$2,500.5") == 250_050
    assert parse_amount("VAT (18%) 12,960.00") == 1_296_000
    assert parse_amount("no amount here") is None


def test_parse_dates_day_first():
    assert parse_date("Invoice Date: 04/01/2027") == date(2027, 1, 4)
    assert parse_date("15 November 2026") == date(2026, 11, 15)
    assert parse_date("Value Date: 17 Jan 2027") == date(2027, 1, 17)
    assert parse_date("2026-11-18") == date(2026, 11, 18)
    assert parse_date("Nov 21, 2026") == date(2026, 11, 21)
    assert parse_date("31/02/2026") is None


def test_currency_and_format():
    assert detect_currency("Total LKR 120,000.00 ... Rs. 5") == "LKR"
    assert detect_currency("Amount: USD 2,500.00") == "USD"
    assert detect_currency("nothing") is None
    assert format_minor(3_000_000, "LKR") == "LKR 30,000.00"
