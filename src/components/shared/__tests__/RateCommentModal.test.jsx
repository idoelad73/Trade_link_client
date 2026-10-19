import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, setLang } from '../../../test/utils.jsx';
import RateCommentModal from '../RateCommentModal.jsx';

/**
 * One component serves both sides of the feature, so the branch that matters
 * most is readOnly: a trade pro must never get an editable field, and the
 * contractor must never lose what they typed.
 */

describe('RateCommentModal — contractor (editable)', () => {
  it('saves the typed text and closes', async () => {
    const onSave  = vi.fn();
    const onClose = vi.fn();
    const user    = userEvent.setup();

    renderWithProviders(
      <RateCommentModal tradeName="Painter" value="" onSave={onSave} onClose={onClose} />
    );

    await user.type(screen.getByRole('textbox'), 'Covers prep and 2 coats.');
    await user.click(screen.getByRole('button', { name: /save comment/i }));

    expect(onSave).toHaveBeenCalledWith('Covers prep and 2 coats.');
    expect(onClose).toHaveBeenCalled();
  });

  it('pre-fills an existing comment so editing does not start from blank', () => {
    renderWithProviders(
      <RateCommentModal tradeName="Painter" value="Existing note" onSave={vi.fn()} onClose={vi.fn()} />
    );
    expect(screen.getByRole('textbox')).toHaveValue('Existing note');
  });

  it('trims whitespace before saving', async () => {
    const onSave = vi.fn();
    const user   = userEvent.setup();

    renderWithProviders(
      <RateCommentModal tradeName="Painter" value="   padded   " onSave={onSave} onClose={vi.fn()} />
    );

    await user.click(screen.getByRole('button', { name: /save comment/i }));
    expect(onSave).toHaveBeenCalledWith('padded');
  });

  it('caps input at 1000 characters', async () => {
    const onSave = vi.fn();
    const user   = userEvent.setup();

    renderWithProviders(
      <RateCommentModal tradeName="Painter" value={'x'.repeat(1200)} onSave={onSave} onClose={vi.fn()} />
    );

    await user.click(screen.getByRole('button', { name: /save comment/i }));
    expect(onSave.mock.calls[0][0]).toHaveLength(1000);
  });

  it('discards the draft when cancelled', async () => {
    const onSave  = vi.fn();
    const onClose = vi.fn();
    const user    = userEvent.setup();

    renderWithProviders(
      <RateCommentModal tradeName="Painter" value="" onSave={onSave} onClose={onClose} />
    );

    await user.type(screen.getByRole('textbox'), 'throwaway');
    await user.click(screen.getByRole('button', { name: /^cancel$/i }));

    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});

describe('RateCommentModal — trade pro (read-only)', () => {
  it('shows the text with no editable field and no save button', () => {
    renderWithProviders(
      <RateCommentModal tradeName="Painter" value="Budget covers prep + 2 coats." readOnly onClose={vi.fn()} />
    );

    expect(screen.getByText('Budget covers prep + 2 coats.')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save comment/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  it('explains the gap when the contractor wrote nothing', () => {
    renderWithProviders(
      <RateCommentModal tradeName="Painter" value="   " readOnly onClose={vi.fn()} />
    );
    expect(screen.getByText(/has not added an explanation/i)).toBeInTheDocument();
  });
});

describe('RateCommentModal — dismissal and i18n', () => {
  it('closes on Escape', async () => {
    const onClose = vi.fn();
    const user    = userEvent.setup();

    renderWithProviders(<RateCommentModal tradeName="Painter" value="" onSave={vi.fn()} onClose={onClose} />);
    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
  });

  it('renders Spanish copy when the UI language is es', () => {
    setLang('es');
    renderWithProviders(
      <RateCommentModal tradeName="Pintor" value="Nota" readOnly onClose={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: /cerrar/i })).toBeInTheDocument();
    setLang('en');
  });
});
