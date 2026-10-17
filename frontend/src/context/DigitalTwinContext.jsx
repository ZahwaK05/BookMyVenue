/* eslint-disable react-refresh/only-export-components */
/**
 * @file DigitalTwinContext.jsx
 * @description React Context managing the live campus Digital Twin state, filters, and temporal perspectives.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getCampusTwinGraph,
  submitVenueIssueReport,
  subscribeTwinEvents,
} from '../services/realDigitalTwinService';

const DigitalTwinContext = createContext(null);

export function DigitalTwinProvider({ children }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const [campusGraph, setCampusGraph] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportModalVenue, setReportModalVenue] = useState(null);
  const [predictionWindowHours, setPredictionWindowHours] = useState(2);

  // Directly derive active view state from URL query parameters (single source of truth)
  const selectedBlockId = searchParams.get('block') || 'AB1';
  const selectedFloorNumber =
    searchParams.get('floor') !== null ? parseInt(searchParams.get('floor'), 10) : 1;
  const selectedVenueId = searchParams.get('venue') || null;
  const temporalMode = searchParams.get('time') || 'current';

  // Load campus twin graph when temporal parameters change
  const loadGraph = useCallback(async (mode = temporalMode, hours = predictionWindowHours) => {
    try {
      setLoading(true);
      setError(null);
      const graph = await getCampusTwinGraph(mode, hours);
      setCampusGraph(graph);
    } catch (err) {
      console.error('[DigitalTwinContext] Error loading graph:', err);
      setError('Failed to synchronize campus Digital Twin state.');
    } finally {
      setLoading(false);
    }
  }, [temporalMode, predictionWindowHours]);

  useEffect(() => {
    let isCancelled = false;
    async function initFetch() {
      try {
        setLoading(true);
        setError(null);
        const graph = await getCampusTwinGraph(temporalMode, predictionWindowHours);
        if (!isCancelled) setCampusGraph(graph);
      } catch (err) {
        if (!isCancelled) {
          console.error('[DigitalTwinContext] Error loading graph:', err);
          setError('Failed to synchronize campus Digital Twin state.');
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }
    initFetch();
    return () => {
      isCancelled = true;
    };
  }, [temporalMode, predictionWindowHours]);

  // Deep-link helper: when a venue is selected, update URL parameters
  const selectVenue = useCallback(
    (venueId) => {
      if (venueId && campusGraph) {
        // Find which block and floor this venue belongs to
        for (const block of campusGraph.blocks) {
          for (const floor of block.floors) {
            const found = floor.venues.find((v) => v.id === venueId || v.code === venueId);
            if (found) {
              setSearchParams({
                block: block.code,
                floor: floor.floorNumber.toString(),
                venue: found.code,
                time: temporalMode,
              });
              return;
            }
          }
        }
      } else {
        const params = new URLSearchParams(searchParams);
        params.delete('venue');
        setSearchParams(params);
      }
    },
    [campusGraph, searchParams, setSearchParams, temporalMode]
  );

  const selectBlock = useCallback(
    (blockCode) => {
      const blk = campusGraph?.blocks.find((b) => b.code === blockCode || b.id === blockCode);
      const firstFloorNum = blk?.floors?.[0]?.floorNumber ?? 1;
      setSearchParams({ block: blockCode, floor: firstFloorNum.toString(), time: temporalMode });
    },
    [campusGraph, setSearchParams, temporalMode]
  );

  const selectFloor = useCallback(
    (floorNum) => {
      const params = new URLSearchParams(searchParams);
      params.set('floor', floorNum.toString());
      params.delete('venue');
      setSearchParams(params);
    },
    [searchParams, setSearchParams]
  );

  const setTemporalMode = useCallback(
    (mode, hours = 2) => {
      setPredictionWindowHours(hours);
      const params = new URLSearchParams(searchParams);
      params.set('time', mode);
      setSearchParams(params);
    },
    [searchParams, setSearchParams]
  );

  // Real-time telemetry sync listener — polls the live twin every 30 s
  useEffect(() => {
    const unsubscribe = subscribeTwinEvents((evt) => {
      setCampusGraph((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          timestamp: evt.timestamp,
        };
      });
    });
    return unsubscribe;
  }, []);

  // Submit issue report wrapper
  const handleReportIssue = async (reportPayload) => {
    const res = await submitVenueIssueReport(reportPayload);
    await loadGraph(temporalMode, predictionWindowHours);
    return res;
  };

  const activeBlock =
    campusGraph?.blocks.find((b) => b.code === selectedBlockId || b.id === selectedBlockId) || campusGraph?.blocks[0];
  const activeFloor =
    activeBlock?.floors.find((f) => f.floorNumber === selectedFloorNumber) ||
    activeBlock?.floors[0];
  const activeVenue =
    selectedVenueId && campusGraph
      ? activeFloor?.venues.find((v) => v.id === selectedVenueId || v.code === selectedVenueId) ||
        campusGraph.blocks
          .flatMap((b) => b.floors)
          .flatMap((f) => f.venues)
          .find((v) => v.id === selectedVenueId || v.code === selectedVenueId)
      : null;

  const value = {
    campusGraph,
    selectedBlockId,
    selectedFloorNumber: activeFloor?.floorNumber ?? selectedFloorNumber,
    selectedVenueId,
    activeBlock,
    activeFloor,
    activeVenue,
    temporalMode,
    predictionWindowHours,
    loading,
    error,
    reportModalVenue,
    setReportModalVenue,
    refreshTwinState: loadGraph,
    selectVenue,
    selectBlock,
    selectFloor,
    setTemporalMode,
    reportEquipmentIssue: handleReportIssue,
  };

  return <DigitalTwinContext.Provider value={value}>{children}</DigitalTwinContext.Provider>;
}

export function useDigitalTwin() {
  const ctx = useContext(DigitalTwinContext);
  if (!ctx) throw new Error('useDigitalTwin must be used within a DigitalTwinProvider');
  return ctx;
}

