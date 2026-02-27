
import { Injectable } from '@angular/core';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { map, tap } from 'rxjs/operators';
import { catchError } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
export interface ValidationError {
  severity: string;
  message: string;
  tag: string;
  index: number;
  snip?: string;
  loop?: string;
  line?: number;
  ordinal?: number;
  segment?: string;
  details?: string;
  validatingSegment?: string;
}
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  totalErrors?: number;
  suppressErrorTable?: boolean;
  rawMessage?: string;
}

interface ApiValidationResponse {
  transaction: string;
  fileName: string;
  status: string;
  details: string;
  ack?: string;
}

interface ApiValidationRequest {
  operation: string;
  transaction: string;
  snipLevel: number;
  logToDb: number;
  x12String: string;
}

const DETAIL_KEYS = ['Line', 'Ordinal', 'Segment', 'Loop', 'Snip', 'Details', 'ValidatingSegment'] as const;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractField(block: string, key: string): string {
  const keyPattern = DETAIL_KEYS
    .slice()
    .sort((left, right) => right.length - left.length)
    .map((detailKey) => escapeRegex(detailKey))
    .join('|');
  const keyEscaped = escapeRegex(key);
  const regex = new RegExp(
    `\\b${keyEscaped}\\b\\s*:\\s*([\\s\\S]*?)(?=(?:[,;\\n\\r]\\s*)?\\b(?:${keyPattern})\\b\\s*:|$)`,
    'i'
  );
  return block.match(regex)?.[1]?.trim() ?? '';
}
@Injectable({ providedIn: 'root' })
export class ValidatorService {
  private baseUrl = 'x12-api';
  private rawHttp: HttpClient;

  constructor(private http: HttpClient, httpBackend: HttpBackend) {
    this.rawHttp = new HttpClient(httpBackend);
  }

  validate(x12Data: string, transactionType: string) {
    const payload: ApiValidationRequest = {
      operation: 'RDP',
      transaction: transactionType || '271',
      snipLevel: 2,
      logToDb: 0,
      x12String: x12Data
    };

    const isShHosted = typeof window !== 'undefined' && window.location.pathname.toLowerCase().startsWith('/sh');
    const endpointCandidates = isShHosted
      ? ['/SH/x12-api/X12', `${this.baseUrl}/X12`, `/x12-api/X12`]
      : [`/x12-api/X12`, `${this.baseUrl}/X12`];

    console.info('[ValidatorService] Endpoint candidates:', endpointCandidates);
    console.info('[ValidatorService] Payload:', {
      operation: payload.operation,
      transaction: payload.transaction,
      snipLevel: payload.snipLevel,
      logToDb: payload.logToDb,
      x12Length: x12Data?.length ?? 0
    });

    const callEndpoint = (index: number): Observable<ApiValidationResponse> => {
      const url = endpointCandidates[index];
      console.info('[ValidatorService] Calling validation service...' + url);

      return this.rawHttp.post<ApiValidationResponse>(url, payload).pipe(
        tap({
          next: (response) => {
            console.info('[ValidatorService] Validation service response received:', response?.status, 'from', url);
          },
          error: (error) => {
            console.error('[ValidatorService] Validation service call failed:', error, 'from', url);
          }
        }),
        catchError((error) => {
          if (index < endpointCandidates.length - 1) {
            const status = error?.status;
            console.warn('[ValidatorService] Endpoint failed, retrying next candidate:', url, 'status:', status);
            return callEndpoint(index + 1);
          }
          return throwError(() => error);
        })
      );
    };

    return callEndpoint(0).pipe(
      map((response): ValidationResult => {
        const isValid = (response?.status || '').toUpperCase() === 'PASS';
        if (isValid) {
          return { isValid: true, errors: [], totalErrors: 0 };
        }

        const statusText = response?.status || '';
        const details = response?.details || '';
        const serviceMessage = [statusText, details].filter(Boolean).join('; ');
        const effectiveMessage = serviceMessage || 'Validation failed';
        console.info(effectiveMessage);
        const maxErrorsMatch = effectiveMessage.match(/More than\s+MAX_ERRORS\s+errors:\s*(\d+)/i);
        if (maxErrorsMatch) {
          const totalErrors = Number(maxErrorsMatch[1]);
          return {
            isValid: false,
            errors: [],
            totalErrors: Number.isFinite(totalErrors) ? totalErrors : undefined,
            suppressErrorTable: true,
            rawMessage: effectiveMessage
          };
        }

        const errorDetails = details || effectiveMessage;

        const lineBlocks = errorDetails
          .match(/Line:\s*\d+[\s\S]*?(?=Line:\s*\d+|$)/gi)
          ?.map((block) => block.trim().replace(/^[,;\s]+/, '')) ?? [];

        if (lineBlocks.length > 0) {
          return {
            isValid: false,
            errors: lineBlocks.map((block, index) => {
              const lineRaw = extractField(block, 'Line');
              const ordinalRaw = extractField(block, 'Ordinal');
              const segmentRaw = extractField(block, 'Segment');
              const loopRaw = extractField(block, 'Loop');
              const snipRaw = extractField(block, 'Snip');
              const detailsRaw = extractField(block, 'Details');
              const validatingSegmentRaw = extractField(block, 'ValidatingSegment');

              const messageParts = [detailsRaw, validatingSegmentRaw].filter(Boolean);
              const message = messageParts.length > 0 ? messageParts.join(' | ') : block;
              const lineNumber = Number(lineRaw);
              const ordinalPosition = Number(ordinalRaw);
              const parsedIndex = Number.isFinite(ordinalPosition)
                ? ordinalPosition
                : (Number.isFinite(lineNumber) ? lineNumber : index + 1);

              return {
                severity: 'ERROR',
                message,
                tag: segmentRaw || response?.transaction || '',
                index: Number.isFinite(parsedIndex) ? parsedIndex : index + 1,
                snip: snipRaw || undefined,
                loop: loopRaw,
                line: Number.isFinite(lineNumber) ? lineNumber : undefined,
                ordinal: Number.isFinite(ordinalPosition) ? ordinalPosition : undefined,
                segment: segmentRaw || undefined,
                details: detailsRaw || undefined,
                validatingSegment: validatingSegmentRaw || undefined
              };
            }),
            totalErrors: lineBlocks.length
          };
        }

        const segmentMessages = errorDetails
          .match(/Segment:[\s\S]*?(?=Segment:|$)/gi)
          ?.map((message) => message.trim().replace(/^[,;\s]+/, '')) ?? [];

        if (segmentMessages.length > 0) {
          return {
            isValid: false,
            errors: segmentMessages.map((message, index) => ({
              severity: 'ERROR',
              message,
              tag: response?.transaction || '',
              index: index + 1,
              loop: ''
            })),
            totalErrors: segmentMessages.length
          };
        }

        return {
          isValid: false,
          errors: [{
            severity: 'ERROR',
            message: errorDetails,
            tag: response?.transaction || '',
            index: 0,
            loop: ''
          }],
          totalErrors: 1
        };
      })
    );
  }
}
