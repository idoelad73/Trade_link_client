import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, setLang } from '../../../test/utils.jsx';
import TermsCheckbox, { TERMS_VERSION, termsError } from '../TermsCheckbox.jsx';
import TermsOfUseModal from '../TermsOfUseModal.jsx';
import terms from '../../../constants/terms_of_use.json';

describe('TermsCheckbox', () => {
  it('reports ticking and unticking to the form', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(<TermsCheckbox checked={false} onChange={onChange} />);
    await user.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(true);

    onChange.mockClear();
    renderWithProviders(<TermsCheckbox checked onChange={onChange} />);
    await user.click(screen.getAllByRole('checkbox')[1]);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('exports the version for the audit record without showing it in the UI', () => {
    renderWithProviders(<TermsCheckbox checked={false} onChange={vi.fn()} />);
    // The version is still sent to the server on submit, but the user-facing
    // label stays clean — no version string next to the checkbox.
    expect(TERMS_VERSION).toBe(terms.version);
    expect(screen.queryByText(`v${TERMS_VERSION}`)).not.toBeInTheDocument();
  });

  it('opens the full Terms from the inline link without toggling the box', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(<TermsCheckbox checked={false} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /terms of use/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // Clicking the link must not tick the box — the user has only opened it.
    expect(onChange).not.toHaveBeenCalled();
  });

  it('uses Spanish copy when the UI language is es', () => {
    setLang('es');
    renderWithProviders(<TermsCheckbox checked={false} onChange={vi.fn()} />);
    expect(screen.getByText(/he leído y acepto/i)).toBeInTheDocument();
    expect(termsError('es')).toMatch(/Términos de Uso/);
    setLang('en');
  });
});

describe('TermsOfUseModal', () => {
  it('renders every section and clause from the JSON', () => {
    renderWithProviders(<TermsOfUseModal onClose={vi.fn()} />);
    const dialog = within(screen.getByRole('dialog'));

    for (const section of terms.sections) {
      expect(dialog.getByText(`${section.number}. ${section.title}`)).toBeInTheDocument();
    }
    // Spot-check a clause that users are most likely to care about.
    expect(dialog.getByText(/6\.7% of each job payment/)).toBeInTheDocument();
  });

  it('renders the prohibited-conduct bullet list', () => {
    renderWithProviders(<TermsOfUseModal onClose={vi.fn()} />);
    expect(screen.getByText(/forged licenses, or altered insurance certificates/i)).toBeInTheDocument();
  });

  it('does NOT include the PDF\'s internal drafting notes', () => {
    renderWithProviders(<TermsOfUseModal onClose={vi.fn()} />);
    // Page 1 of the source PDF is a to-do list for the author, not terms.
    expect(screen.queryByText(/Replace every \[bracketed\] placeholder/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Have a licensed attorney review/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Write a Privacy Policy/i)).not.toBeInTheDocument();
  });

  it('links the signed PDF', () => {
    renderWithProviders(<TermsOfUseModal onClose={vi.fn()} />);
    const link = screen.getByRole('link', { name: /download pdf/i });
    expect(link).toHaveAttribute('href', '/legal/TradeLink-Terms-of-Use.pdf');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<TermsOfUseModal onClose={onClose} />);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('shows a plain Close button when not being used to accept', () => {
    renderWithProviders(<TermsOfUseModal onClose={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /i agree/i })).not.toBeInTheDocument();
  });

  it('offers an I-agree button when an onAccept handler is supplied', () => {
    renderWithProviders(<TermsOfUseModal onClose={vi.fn()} onAccept={vi.fn()} />);
    expect(screen.getByRole('button', { name: /i agree/i })).toBeInTheDocument();
  });
});
