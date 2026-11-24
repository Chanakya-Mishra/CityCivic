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
  ArrowRight,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  XCircle,
  UploadCloud,
  Check,
} from "lucide-react";

export default function ReportIssuePage() {
  const router = useRouter();
  const { user, openAuthModal } = useAuth();

  const [categories, setCategories] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryCode, setCategoryCode] = useState("POTHOLE");

  // Geotag & Location States (Auto-calculated)
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [locationSource, setLocationSource] = useState<
    "DETECTING" | "DEVICE_GPS" | "EXIF_CAMERA" | "FALLBACK"
  >("DETECTING");
  const [address, setAddress] = useState("");
  const [fetchingGps, setFetchingGps] = useState(false);

  // Photo & EXIF States (Mandatory)
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [exifInfo, setExifInfo] = useState<any>(null);

  // AI Visual Triage States (Automatic)
  const [aiTriageLoading, setAiTriageLoading] = useState(false);
  const [aiTriageResult, setAiTriageResult] = useState<any>(null);
  const [categoryNotice, setCategoryNotice] = useState<string | null>(null);

  // Deduplication & Submission States
  const [duplicateCandidates, setDuplicateCandidates] = useState<any[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch Categories on Mount
  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        setCategories(data.categories || []);
        if (data.categories?.length > 0) {
          setCategoryCode(data.categories[0].code);
        }
      })
      .catch((err) => console.warn("Failed to load categories:", err));
  }, []);

  // 2. Auto-Detect Device Location on Mount
  const detectDeviceLocation = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLatitude(12.9784);
      setLongitude(77.6408);
      setLocationSource("FALLBACK");
      if (!address) setAddress("100ft Road, Indiranagar, Bengaluru");
      return;
    }

    setFetchingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setLatitude(lat);
        setLongitude(lng);
        setGpsAccuracy(Math.round(pos.coords.accuracy));
        setLocationSource("DEVICE_GPS");
        if (!address) {
          setAddress(`GPS Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
        }
        setFetchingGps(false);
      },
      (err) => {
        console.warn("Device GPS access denied or timed out:", err.message);
        // Default to Indiranagar Ward 02 coordinates
        setLatitude(12.9784);
        setLongitude(77.6408);
        setLocationSource("FALLBACK");
        if (!address) setAddress("100ft Road, Indiranagar, Bengaluru");
        setFetchingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  useEffect(() => {
    detectDeviceLocation();
  }, []);

  // 3. Automated AI Visual Triage Trigger
  const runAutomaticAiTriage = async (photoUrl: string, currentCategory: string) => {
    setAiTriageLoading(true);
    setCategoryNotice(null);
    setError(null);

    try {
      const res = await fetch("/api/ai/inspect-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoUrl,
          reportedCategory: currentCategory,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiTriageResult(data);

        if (data.isCivicIssue) {
          // Align category if AI identified a specific category
          if (data.predictedCategory) {
            const predUpper = String(data.predictedCategory).toUpperCase();
            const matched = categories.find(
              (c) => c.code.toUpperCase() === predUpper
            );
            if (matched && matched.code !== currentCategory) {
              setCategoryCode(matched.code);
              setCategoryNotice(
                `AI detected "${matched.name}". Category automatically aligned to dispatch the correct ward department.`
              );
            }
          }

          // Auto-fill description if currently empty
          if (data.hazardAnalysis && !description) {
            setDescription(data.hazardAnalysis);
          }

          // Auto-fill title if empty
          if (!title) {
            const catObj = categories.find(
              (c) => c.code === (data.predictedCategory || currentCategory)
            );
            setTitle(`${catObj?.name || "Civic Hazard"} at ${address || "location"}`);
          }
        }
      }
    } catch (err) {
      console.warn("AI Triage inspection failed:", err);
    } finally {
      setAiTriageLoading(false);
    }
  };

  // 4. File Upload Handler with Auto EXIF and Auto AI Triage
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setError(null);
    setAiTriageResult(null);
    setCategoryNotice(null);

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

      setUploadedPhotoUrl(data.url);
      setExifInfo(data.exif);

      // If camera photo contains EXIF GPS, prioritize as ground truth
      if (data.exif?.hasGps && data.exif.latitude && data.exif.longitude) {
        const exifLat = parseFloat(data.exif.latitude.toFixed(6));
        const exifLng = parseFloat(data.exif.longitude.toFixed(6));
        setLatitude(exifLat);
        setLongitude(exifLng);
        setLocationSource("EXIF_CAMERA");
        setAddress(
          `Camera EXIF Ground Truth (${exifLat.toFixed(4)}, ${exifLng.toFixed(4)}) - ${data.exif.model || "Mobile Device"}`
        );
      }

      // Automatically run AI Visual Triage immediately!
      await runAutomaticAiTriage(data.url, categoryCode);
    } catch (err: any) {
      setError(err.message || "Failed to upload photo proof.");
    } finally {
      setUploadingFile(false);
    }
  };

  // 5. Live Duplicate Interception whenever coordinates or category change
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
        alert(
          "Thank you! You have corroborated the existing report. We increased its severity score."
        );
        router.push(`/issues/${candidateId}`);
      } else {
        const d = await res.json();
        alert(d.error || "Failed to upvote");
      }
    } catch {
      alert("Failed to upvote existing issue.");
    }
  };

  // AI Validation Gate Logic
  const hasPhoto = Boolean(uploadedPhotoUrl);
  const isAiReject = aiTriageResult && aiTriageResult.isCivicIssue === false;
  const isAiApproved = aiTriageResult && aiTriageResult.isCivicIssue === true;
  const canSubmit =
    hasPhoto &&
    !uploadingFile &&
    !aiTriageLoading &&
    isAiApproved &&
    !isAiReject &&
    Boolean(title.trim());

  // Handle Form Submission
  const handleSubmit = async (linkedMasterId?: string | null) => {
    if (!user) {
      openAuthModal();
      return;
    }

    if (!uploadedPhotoUrl) {
      setError("Photo proof is mandatory. Please upload a clear photo of the civic issue.");
      return;
    }

    if (isAiReject) {
      setError(
        "Cannot submit: AI inspection determined this photo does not show a genuine civic hazard. Please upload a genuine photo."
      );
      return;
    }

    if (!title.trim() || !categoryCode || latitude === null || longitude === null) {
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
          description: description || "Reported via CityCivic citizen portal.",
          categoryCode,
          latitude,
          longitude,
          address: address || "Location identified by GPS",
          photoUrl: uploadedPhotoUrl,
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
          GPS coordinates are calculated automatically. Mandatory photographic proof is inspected by Gemini AI Vision to verify genuine civic damage and eliminate fake reports.
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
            <div className="p-2 bg-amber-500 text-white rounded-xl shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-amber-950">
                Spatial Duplicate Alert: Similar Issue Found Within {duplicateCandidates[0].distanceMeters}m!
              </h3>
              <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                Our spatial engine detected an active complaint nearby. Instead of filing a duplicate and cluttering ward backlog, you can upvote the existing ticket to boost its severity index.
              </p>

              <div className="mt-3 p-3 bg-white rounded-xl border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={duplicateCandidates[0].photoUrl}
                    alt="Existing issue"
                    className="w-14 h-14 rounded-lg object-cover border border-slate-200 shrink-0"
                  />
                  <div>
                    <span className="font-mono text-[11px] font-bold text-slate-500">
                      {duplicateCandidates[0].trackingCode}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                      {duplicateCandidates[0].title}
                    </h4>
                    <span className="text-[11px] text-emerald-700 font-semibold">
                      {duplicateCandidates[0].distanceMeters}m away • {duplicateCandidates[0].upvoteCount} citizens verified
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
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
                    className="flex-1 sm:flex-none px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-[11px] font-medium rounded-xl transition cursor-pointer"
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
          if (canSubmit) handleSubmit(null);
        }}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6"
      >
        {/* STEP 1: Mandatory Photo Proof & Auto AI Inspection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span>1. Photographic Proof</span>
              <span className="text-red-500 font-black">*Required</span>
            </label>
            <span className="text-[11px] text-slate-500">Gemini AI Vision Verification Gate</span>
          </div>

          {!uploadedPhotoUrl ? (
            <label className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50/80 hover:bg-emerald-50/30 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition text-center group">
              <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-700 group-hover:text-emerald-600 group-hover:scale-110 transition duration-200 mb-3">
                <Camera className="w-7 h-7" />
              </div>
              <span className="text-sm font-extrabold text-slate-900 group-hover:text-emerald-800 transition">
                {uploadingFile ? "Uploading & Reading EXIF..." : "Tap to Take Photo or Upload Image Proof"}
              </span>
              <span className="text-xs text-slate-500 mt-1 max-w-sm">
                Photo evidence is strictly mandatory. AI Vision will automatically inspect the photo for outdoor civic damage and extract ground-truth GPS.
              </span>
              <div className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 group-hover:bg-emerald-600 transition shadow-sm">
                <UploadCloud className="w-4 h-4" />
                <span>Select Photo from Camera or Files</span>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploadingFile}
                className="hidden"
              />
            </label>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="w-full sm:w-48 aspect-video rounded-xl overflow-hidden bg-slate-200 border border-slate-300 shrink-0 relative">
                  <img
                    src={uploadedPhotoUrl}
                    alt="Uploaded Proof"
                    className="w-full h-full object-cover"
                  />
                  <label className="absolute bottom-1.5 right-1.5 px-2 py-1 bg-black/70 hover:bg-black text-white text-[10px] font-bold rounded-lg cursor-pointer transition backdrop-blur-sm">
                    Change
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" />
                      Photo Uploaded Successfully
                    </span>
                    {exifInfo?.hasGps && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                        EXIF GPS Verified
                      </span>
                    )}
                  </div>

                  {/* AI Triage Loading Spinner */}
                  {aiTriageLoading && (
                    <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-950 flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0" />
                      <div>
                        <span className="font-bold block">Gemini AI Vision Inspecting Photo...</span>
                        <span className="text-[11px] text-indigo-700">Verifying genuine civic hazard, estimating severity, and checking category alignment.</span>
                      </div>
                    </div>
                  )}

                  {/* AI Rejection Alert (Gate Failed) */}
                  {isAiReject && !aiTriageLoading && (
                    <div className="p-3.5 bg-red-50 border-2 border-red-300 rounded-xl text-xs text-red-950 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-red-800 text-xs">
                        <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>AI Gate Rejected: Non-Civic Image Detected</span>
                      </div>
                      <p className="text-[11px] text-red-900 leading-relaxed">
                        {aiTriageResult.hazardAnalysis ||
                          "The uploaded photo does not appear to show a genuine outdoor municipal defect. Submissions are strictly restricted to real civic damage."}
                      </p>
                      <div className="pt-1">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-[11px] font-bold cursor-pointer hover:bg-red-700 transition">
                          <Camera className="w-3.5 h-3.5" />
                          <span>Upload a Real Civic Photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {/* AI Approval Badge (Gate Passed) */}
                  {isAiApproved && !aiTriageLoading && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-emerald-600" />
                          AI Inspection Passed: Genuine Civic Issue
                        </span>
                        <span className="text-[11px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
                          Hazard: {aiTriageResult.estimatedHazard}/10
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-800 leading-relaxed">
                        {aiTriageResult.hazardAnalysis}
                      </p>
                      {aiTriageResult.recommendedTags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {aiTriageResult.recommendedTags.map((tag: string) => (
                            <span
                              key={tag}
                              className="text-[10px] bg-white text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200 font-mono font-medium"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Automatic Category Realignment Notice */}
              {categoryNotice && (
                <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{categoryNotice}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* STEP 2: Auto-Calculated Geotag & Location */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              2. Incident Geotag & Location (Auto-Calculated)
            </label>
            <button
              type="button"
              onClick={detectDeviceLocation}
              disabled={fetchingGps}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${fetchingGps ? "animate-spin" : ""}`} />
              <span>{fetchingGps ? "Detecting GPS..." : "Refresh Device GPS"}</span>
            </button>
          </div>

          {/* Auto Location Display Card */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900">
                      {latitude !== null && longitude !== null
                        ? `${latitude.toFixed(5)}° N, ${longitude.toFixed(5)}° E`
                        : "Detecting location..."}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        locationSource === "EXIF_CAMERA"
                          ? "bg-purple-100 text-purple-800"
                          : locationSource === "DEVICE_GPS"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {locationSource === "EXIF_CAMERA"
                        ? "Camera EXIF Ground Truth"
                        : locationSource === "DEVICE_GPS"
                        ? "Live Device GPS"
                        : "Bengaluru Center"}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {locationSource === "EXIF_CAMERA"
                      ? `Extracted from photo camera metadata (${exifInfo?.model || "Device"})`
                      : gpsAccuracy
                      ? `Device satellite lock (Accuracy: ±${gpsAccuracy}m)`
                      : "Default Ward 02 central coordinates"}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Landmark or Nearby Building (Optional guidance for ward crew)
              </label>
              <input
                type="text"
                placeholder="e.g. Opposite BDA Complex, 100ft Road, Indiranagar"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>
          </div>
        </div>

        {/* STEP 3: Issue Category */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            3. Issue Category
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {categories.map((cat) => {
              const isSelected = categoryCode === cat.code;
              return (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategoryCode(cat.code)}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? "border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <span className="font-bold text-xs text-slate-900">{cat.name}</span>
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 truncate mr-1">{cat.department}</span>
                    <span className="font-semibold text-emerald-700 shrink-0">
                      Hazard: {cat.baseHazard}/10
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* STEP 4: Title & Description */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              4. Title / Summary
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
              5. Description & Impact
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

        {/* SUBMIT BUTTON WITH AI VALIDATION GATE */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldAlert className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Authenticated via Email OTP with phone number recorded for field crew.</span>
          </div>

          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className={`w-full sm:w-auto px-6 py-3 font-bold rounded-xl text-sm transition shadow-lg flex items-center justify-center gap-2 ${
              canSubmit && !submitting
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 cursor-pointer"
                : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
            }`}
          >
            {submitting ? (
              "Submitting Incident..."
            ) : !hasPhoto ? (
              "📸 Upload Photo Proof to Proceed"
            ) : uploadingFile ? (
              "⏳ Uploading Photo..."
            ) : aiTriageLoading ? (
              "✨ Gemini AI Inspecting Photo..."
            ) : isAiReject ? (
              "❌ Photo Rejected by AI (Non-Civic)"
            ) : (
              <>
                <span>Submit New Civic Report</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
