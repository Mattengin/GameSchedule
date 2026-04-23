import * as React from 'react';
import type { Session } from '@supabase/supabase-js';
import type { AvailabilitySetting, AvailabilityWindow } from './homeTypes';
import { createTimeDate } from './homeUtils';
import { supabase } from '../../services/supabaseClient';

export function useAvailabilityState(session: Session | null) {
  const [availabilityLoading, setAvailabilityLoading] = React.useState(false);
  const [availabilityBusy, setAvailabilityBusy] = React.useState(false);
  const [availabilityError, setAvailabilityError] = React.useState('');
  const [availabilityMessage, setAvailabilityMessage] = React.useState('');
  const [availabilityWindows, setAvailabilityWindows] = React.useState<AvailabilityWindow[]>([]);
  const [autoDeclineOutsideHours, setAutoDeclineOutsideHours] = React.useState(false);
  const [availabilityDraft, setAvailabilityDraft] = React.useState({
    dayKey: 'Mon',
    startsAt: createTimeDate(20, 0).toISOString(),
    endsAt: createTimeDate(22, 0).toISOString(),
  });

  React.useEffect(() => {
    if (!session?.user) {
      setAvailabilityWindows([]);
      setAutoDeclineOutsideHours(false);
      setAvailabilityLoading(false);
      return;
    }

    const loadAvailability = async () => {
      setAvailabilityLoading(true);
      setAvailabilityError('');

      const [{ data: settings, error: settingsError }, { data: windows, error: windowsError }] =
        await Promise.all([
          supabase
            .from('availability_settings')
            .select('profile_id, auto_decline_outside_hours')
            .eq('profile_id', session.user.id)
            .maybeSingle(),
          supabase
            .from('availability_windows')
            .select('id, profile_id, day_key, starts_at, ends_at, created_at')
            .eq('profile_id', session.user.id)
            .order('day_key', { ascending: true })
            .order('starts_at', { ascending: true }),
        ]);

      if (settingsError || windowsError) {
        setAvailabilityError(settingsError?.message ?? windowsError?.message ?? 'Unable to load availability.');
        setAvailabilityLoading(false);
        return;
      }

      setAvailabilityWindows((windows as AvailabilityWindow[] | null) ?? []);
      setAutoDeclineOutsideHours((settings as AvailabilitySetting | null)?.auto_decline_outside_hours ?? false);
      setAvailabilityLoading(false);
    };

    loadAvailability();
  }, [session]);

  const availabilityDraftStartAt = React.useMemo(() => {
    const parsedDate = new Date(availabilityDraft.startsAt);
    return Number.isNaN(parsedDate.getTime()) ? createTimeDate(20, 0) : parsedDate;
  }, [availabilityDraft.startsAt]);

  const availabilityDraftEndAt = React.useMemo(() => {
    const parsedDate = new Date(availabilityDraft.endsAt);
    return Number.isNaN(parsedDate.getTime()) ? createTimeDate(22, 0) : parsedDate;
  }, [availabilityDraft.endsAt]);

  return {
    autoDeclineOutsideHours,
    availabilityBusy,
    availabilityDraft,
    availabilityDraftEndAt,
    availabilityDraftStartAt,
    availabilityError,
    availabilityLoading,
    availabilityMessage,
    availabilityWindows,
    setAutoDeclineOutsideHours,
    setAvailabilityBusy,
    setAvailabilityDraft,
    setAvailabilityError,
    setAvailabilityMessage,
    setAvailabilityWindows,
  };
}
