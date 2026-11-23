"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  MapPin,
  Camera,
  AlertTriangle,
  CheckCircle2,
  ThumbsUp,
  Layers,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Info,
} from "lucide-react";

export default function ReportIssuePage() {
  const router = useRouter();
  const { user, openAuthModal } = useAuth();

  const [categories, setCategories] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryCode, setCategoryCode] = useState("");
  const [latitude, setLatitude] = useState<number | null>(12.9784); // Default Indiranagar coordinates
  const [longitude, setLongitude] = useState<number | null>(77.6408);
  const [address, setAddress] = useState("100ft Road, Indiranagar, Bengaluru");
  const [photoUrl, setPhotoUrl] = useState(
    "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800"
  );
  const [customPhotoInput, setCustomPhotoInput] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [exifInfo, setExifInfo] = useState<any>(null);
  const [aiTriageLoading, setAiTriageLoading] = useState(false);
  const [aiTriageResult, setAiTriageResult] = useState<any>(null);

  // Trigger AI Visual Inspection & Triage
  const handleAiTriage = async () => {
    const currentImg = customPhotoInput || photoUrl;
    if (!currentImg) return;

    setAiTriageLoading(true);
    try {
      const res = await fetch("/api/ai/inspect-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoUrl: currentImg,
          reportedCategory: categoryCode,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiTriageResult(data);
        if (data.predictedCategory) {
          setCategoryCode(data.predictedCategory);
        }
        if (data.hazardAnalysis && !description) {
          setDescription(data.hazardAnalysis);
        }
      }
    } catch {
      // Graceful fallback
    } finally {
      setAiTriageLoading(false);
    }
  };

  // Handle direct file upload with EXIF extraction
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "File upload failed.");
      }

      setCustomPhotoInput(data.url);
      setExifInfo(data.exif);

      // If EXIF GPS coordinates exist, auto-populate the coordinates
      if (data.exif?.hasGps && data.exif.latitude && data.exif.longitude) {
        setLatitude(parseFloat(data.exif.latitude.toFixed(6)));
        setLongitude(parseFloat(data.exif.longitude.toFixed(6)));
        setAddress(
          `GPS extracted from photo EXIF: (${data.exif.latitude.toFixed(4)}, ${data.exif.longitude.toFixed(4)})`
        );
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadingFile(false);
    }
  };

  // Deduplication state
  const [duplicateCandidates, setDuplicateCandidates] = useState<any[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch categories
  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        setCategories(data.categories || []);
        if (data.categories?.length > 0) {
          setCategoryCode(data.categories[0].code);
        }
      });
  }, []);

  // Request browser GPS
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setAddress(`GPS Lat: ${pos.coords.latitude.toFixed(4)}, Lng: ${pos.coords.longitude.toFixed(4)}`);
      },
      (err) => {
        alert(`Could not fetch live location: ${err.message}. Using default Bengaluru coordinates.`);
      }
    );
  };

  // Live duplicate query whenever coordinates or category change
  useEffect(() => {
    if (latitude !== null && longitude !== null && categoryCode) {
      setCheckingDuplicates(true);
      const params = new URLSearchParams({
        lat: latitude.toString(),
        lng: longitude.toString(),
        categoryCode,
        radius: "60",
      });

      fetch(`/api/issues/check-duplicates?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          setDuplicateCandidates(data.candidates || []);
        })
        .catch(() => setDuplicateCandidates([]))
        .finally(() => setCheckingDuplicates(false));
    }
  }, [latitude, longitude, categoryCode]);

  // Handle Upvoting existing candidate instead of duplicating
  const handleUpvoteExisting = async (candidateId: string) => {
    if (!user) {
      openAuthModal();
      return;
    }

    try {
      const res = await fetch(`/api/issues/${candidateId}/upvote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userLat: latitude, userLng: longitude }),
      });

      if (res.ok) {
        alert("Thank you! You have corroborated the existing report. We increased its severity score.");
        router.push(`/issues/${candidateId}`);
      } else {
        const d = await res.json();
        alert(d.error || "Failed to upvote");
      }
    } catch {
      alert("Failed to upvote existing issue.");
    }
  };

  // Handle Form Submission
  const handleSubmit = async (linkedMasterId?: string | null) => {
    if (!user) {
      openAuthModal();
      return;
    }

    if (!title || !categoryCode || latitude === null || longitude === null) {
      setError("Please fill out all required fields: title, category, and location.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          categoryCode,
          latitude,
          longitude,
          address,
          photoUrl: customPhotoInput || photoUrl,
          linkedMasterId: linkedMasterId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit issue.");
      }

      router.push(`/issues/${data.issue.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          Report a Geotagged Civic Issue
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Our intelligent spatial engine checks for existing nearby complaints to prevent duplicate backlog for ward officers.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* DUPLICATE INTERCEPTION BANNER */}
      {duplicateCandidates.length > 0 && (
        <div className="mb-8 p-5 bg-amber-50 border-2 border-amber-300 rounded-2xl shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500 text-white rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-amber-900">
                  Potential Duplicate Detected Nearby!
                </h3>
                <span className="text-xs bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                  {duplicateCandidates[0].distanceMeters}m away
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-1">
                A neighbor has already reported a similar complaint at this exact location:
              </p>

              {/* Duplicate Card */}
              <div className="mt-3 bg-white p-3.5 rounded-xl border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={duplicateCandidates[0].photoUrl}
                    alt="Existing complaint"
                    className="w-16 h-16 rounded-lg object-cover shrink-0"
                  />
                  <div>
                    <span className="font-mono text-[10px] font-bold text-slate-400">
                      {duplicateCandidates[0].trackingCode}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900">
                      {duplicateCandidates[0].title}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Upvoted by {duplicateCandidates[0].upvoteCount} residents • {duplicateCandidates[0].distanceMeters} meters away
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap sm:flex-col gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleUpvoteExisting(duplicateCandidates[0].id)}
                    className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>Yes, Upvote This!</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubmit(duplicateCandidates[0].id)}
                    className="flex-1 sm:flex-none px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-[11px] font-medium rounded-xl transition"
                  >
                    Attach as Child Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Report Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(null);
        }}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6"
      >
        {/* Category Picker */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            1. Issue Category
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {categories.map((cat) => {
              const isSelected = categoryCode === cat.code;
              return (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategoryCode(cat.code)}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    isSelected
                      ? "border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <span className="font-bold text-xs text-slate-900">{cat.name}</span>
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">{cat.department}</span>
                    <span className="font-semibold text-emerald-700">Hazard: {cat.baseHazard}/10</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              2. Title / Summary
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Deep pothole next to bus stop causing accidents"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              3. Description & Impact
            </label>
            <textarea
              rows={3}
              placeholder="Describe the severity, when it happened, or any traffic/pedestrian risk..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Geotag & Location */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              4. Incident Geotag & Location
            </label>
            <button
              type="button"
              onClick={handleGetLocation}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5" />
              Use Current Device GPS
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="text-[11px] text-slate-500 block mb-1">Latitude</span>
              <input
                type="number"
                step="any"
                value={latitude || ""}
                onChange={(e) => setLatitude(parseFloat(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block mb-1">Longitude</span>
              <input
                type="number"
                step="any"
                value={longitude || ""}
                onChange={(e) => setLongitude(parseFloat(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300"
              />
            </div>
          </div>

          <div className="mt-2">
            <span className="text-[11px] text-slate-500 block mb-1">Street Landmark / Address</span>
            <input
              type="text"
              placeholder="e.g. Opposite BDA Complex, 100ft Road"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300"
            />
          </div>
        </div>

        {/* Photo Evidence & EXIF Extraction */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            5. Incident Photo Evidence & Geotag
          </label>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-full sm:w-48 aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
              <img
                src={customPhotoInput || photoUrl}
                alt="Selected preview"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex-1 w-full space-y-2.5">
              {/* Direct File Upload & AI Triage buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition">
                  <Camera className="w-4 h-4" />
                  <span>{uploadingFile ? "Analyzing EXIF..." : "Upload Photo"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleAiTriage}
                  disabled={aiTriageLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{aiTriageLoading ? "AI Analyzing..." : "AI Auto-Triage Hazard"}</span>
                </button>
              </div>

              {aiTriageResult && (
                <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs text-indigo-950">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      AI Visual Triage Result:
                    </span>
                    <span className="font-semibold text-indigo-800">
                      Hazard: {aiTriageResult.estimatedHazard}/10 (Confidence: {(aiTriageResult.confidence * 100).toFixed(0)}%)
                    </span>
                  </div>
                  <p className="text-[11px] text-indigo-900">{aiTriageResult.hazardAnalysis}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {aiTriageResult.recommendedTags?.map((tag: string) => (
                      <span key={tag} className="text-[10px] bg-white text-indigo-800 px-1.5 py-0.5 rounded border border-indigo-200 font-mono">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {exifInfo && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">EXIF Metadata Verified:</span>
                    {exifInfo.hasGps ? (
                      <p className="text-[11px] text-emerald-700">
                        GPS coords ({exifInfo.latitude?.toFixed(4)}, {exifInfo.longitude?.toFixed(4)}) auto-applied! Camera: {exifInfo.model || "Mobile Device"}
                      </p>
                    ) : (
                      <p className="text-[11px] text-emerald-700">
                        Camera capture verified ({exifInfo.model || "Device"}). No GPS tags embedded, using manual/device coordinates.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <input
                type="url"
                placeholder="https://... or paste image URL"
                value={customPhotoInput}
                onChange={(e) => setCustomPhotoInput(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
              />
              <div className="flex flex-wrap gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setCustomPhotoInput("https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800")}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700"
                >
                  Pothole Sample
                </button>
                <button
                  type="button"
                  onClick={() => setCustomPhotoInput("https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800")}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700"
                >
                  Garbage Sample
                </button>
                <button
                  type="button"
                  onClick={() => setCustomPhotoInput("https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800")}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700"
                >
                  Streetlight Sample
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldAlert className="w-4 h-4 text-emerald-600" />
            <span>Authenticated via Email OTP with phone number recorded for field crew.</span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting ? "Submitting Incident..." : "Submit New Civic Report"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
