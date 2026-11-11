import React, { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import LocationInput from './Locationinput';
import { searchPlaces, reverseGeocode } from '../services/Geocode';

vi.mock('../services/geocode', () => ({
  MIN_QUERY_LENGTH: 3,
  searchPlaces: vi.fn(),
  reverseGeocode: vi.fn(),
}));

const STATION = {
  id: 'N1', name: 'Midrand Gautrain Station', detail: 'Midrand, Johannesburg, Gauteng',
  label: 'Midrand Gautrain Station, Midrand, Johannesburg, Gauteng',
  lat: -25.9986, lng: 28.1436, kind: 'rail',
};
const BUS = {
  id: 'N3', name: 'Midrand Bus Stop', detail: 'Johannesburg, Gauteng',
  label: 'Midrand Bus Stop, Johannesburg, Gauteng', lat: -25.99, lng: 28.13, kind: 'bus',
};

function Harness({ spy, allowCurrentLocation = false }) {
  const [value, setValue] = useState('');
  return (
    <LocationInput
      ariaLabel="Boarding stop"
      value={value}
      allowCurrentLocation={allowCurrentLocation}
      onChange={(text, place) => { setValue(text); spy(text, place); }}
    />
  );
}

const input = () => screen.getByRole('combobox', { name: 'Boarding stop' });

beforeEach(() => {
  searchPlaces.mockReset();
  reverseGeocode.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

describe('LocationInput', () => {
  it('does not search until 3 characters are typed', async () => {
    const user = userEvent.setup();
    render(<Harness spy={vi.fn()} />);
    await user.type(input(), 'mi');
    await new Promise(r => setTimeout(r, 450));
    expect(searchPlaces).not.toHaveBeenCalled();
  });

  it('debounces: one search for a burst of typing', async () => {
    searchPlaces.mockResolvedValue([STATION]);
    const user = userEvent.setup();
    render(<Harness spy={vi.fn()} />);
    await user.type(input(), 'midrand');
    await screen.findByRole('option', { name: /Midrand Gautrain Station/ });
    expect(searchPlaces).toHaveBeenCalledTimes(1);
    expect(searchPlaces.mock.calls[0][0]).toBe('midrand');
  });

  it('selecting a suggestion fills the input and reports the place', async () => {
    searchPlaces.mockResolvedValue([STATION, BUS]);
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Harness spy={spy} />);
    await user.type(input(), 'midrand');
    await user.click(await screen.findByRole('option', { name: /Midrand Gautrain Station/ }));
    expect(input()).toHaveValue(STATION.label);
    expect(spy).toHaveBeenLastCalledWith(STATION.label, STATION);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('does not search again after a selection', async () => {
    searchPlaces.mockResolvedValue([STATION]);
    const user = userEvent.setup();
    render(<Harness spy={vi.fn()} />);
    await user.type(input(), 'midrand');
    await user.click(await screen.findByRole('option'));
    await new Promise(r => setTimeout(r, 450));
    expect(searchPlaces).toHaveBeenCalledTimes(1);
  });

  it('supports keyboard selection (ArrowDown + Enter)', async () => {
    searchPlaces.mockResolvedValue([STATION, BUS]);
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Harness spy={spy} />);
    await user.type(input(), 'midrand');
    await screen.findAllByRole('option');
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(spy).toHaveBeenLastCalledWith(BUS.label, BUS);
  });

  it('Escape closes the list', async () => {
    searchPlaces.mockResolvedValue([STATION]);
    const user = userEvent.setup();
    render(<Harness spy={vi.fn()} />);
    await user.type(input(), 'midrand');
    await screen.findByRole('listbox');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('typing after choosing a place clears the stored place (no stale coordinates)', async () => {
    searchPlaces.mockResolvedValue([STATION]);
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Harness spy={spy} />);
    await user.type(input(), 'midrand');
    await user.click(await screen.findByRole('option'));
    await user.type(input(), 'x');
    expect(spy).toHaveBeenLastCalledWith(STATION.label + 'x', null);
  });

  it('shows a message when nothing matches, and keeps the typed text', async () => {
    searchPlaces.mockResolvedValue([]);
    const user = userEvent.setup();
    render(<Harness spy={vi.fn()} />);
    await user.type(input(), 'qwertyuiop');
    expect(await screen.findByText(/No matches found/)).toBeInTheDocument();
    expect(input()).toHaveValue('qwertyuiop');
  });

  it('degrades gracefully when the search service fails', async () => {
    searchPlaces.mockRejectedValue(new Error('network down'));
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Harness spy={spy} />);
    await user.type(input(), 'midrand');
    expect(await screen.findByText(/The place search is unreachable/)).toBeInTheDocument();
    expect(input()).toHaveValue('midrand'); // user is not blocked
    expect(spy).toHaveBeenLastCalledWith('midrand', null);
  });

  it('clear button empties the field and reports no place', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Harness spy={spy} />);
    await user.type(input(), 'abc');
    await user.click(screen.getByRole('button', { name: /Clear Boarding stop/ }));
    expect(input()).toHaveValue('');
    expect(spy).toHaveBeenLastCalledWith('', null);
  });

  it('"Use my current location" reverse-geocodes the GPS fix', async () => {
    reverseGeocode.mockResolvedValue({ ...STATION, lat: -25.99, lng: 28.14 });
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: ok => ok({ coords: { latitude: -25.99, longitude: 28.14 } }),
      },
    });
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Harness spy={spy} allowCurrentLocation />);
    await user.click(input());
    await user.click(await screen.findByRole('option', { name: /Use my current location/ }));
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(reverseGeocode).toHaveBeenCalledWith(-25.99, 28.14);
    expect(spy.mock.calls.at(-1)[1]).toMatchObject({ lat: -25.99, lng: 28.14 });
  });

  it('shows an error when location permission is denied', async () => {
    vi.stubGlobal('navigator', {
      geolocation: { getCurrentPosition: (ok, fail) => fail({ code: 1 }) },
    });
    const user = userEvent.setup();
    render(<Harness spy={vi.fn()} allowCurrentLocation />);
    await user.click(input());
    await user.click(await screen.findByRole('option', { name: /Use my current location/ }));
    expect(await screen.findByText(/permission was denied/)).toBeInTheDocument();
  });
});