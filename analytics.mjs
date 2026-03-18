#!/usr/bin/env node

/**
 * Instagram Reel Analytics
 * Fetches reel performance metrics: plays, reach, watch time
 */

import fetch from "node-fetch"

const IG_ACCOUNT_ID =
  process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID ||
  process.env.INSTAGRAM_ACCOUNT_ID ||
  process.env.IG_ACCOUNT_ID ||
  ""

const FB_TOKEN =
  process.env.FACEBOOK_PAGE_ACCESS_TOKEN ||
  process.env.FB_TOKEN ||
  ""

const API_VERSION = process.env.API_VERSION || "v21.0"
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`

// Logging utilities
const log = (msg, type = "INFO") => {
  const timestamp = new Date().toISOString()
  const prefix = {
    INFO: "ℹ️",
    SUCCESS: "✅",
    ERROR: "❌",
    WARNING: "⚠️"
  }[type] || "ℹ️"
  console.log(`[${timestamp}] ${prefix} ${msg}`)
}

const logSection = (title) => {
  console.log("\n" + "=".repeat(80))
  console.log(title)
  console.log("=".repeat(80))
}

/**
 * Get reel insights
 * Metrics: impressions, reach, plays, engagement, saved, shares
 */
const getReelInsights = async (mediaId) => {
  try {
    logSection("【リール分析】")

    const insightsUrl = `${BASE_URL}/${mediaId}/insights?metrics=impressions,reach,plays,engagement,saved,shares,comments,ig_reels_avg_watch_time,ig_reels_video_view_total_time&access_token=${FB_TOKEN}`

    log(`API URL: ${insightsUrl.substring(0, 80)}...`, "INFO")

    const response = await fetch(insightsUrl)
    const result = await response.json()

    if (result.error) {
      log(`❌ Insights取得エラー: ${result.error.message}`, "ERROR")
      return null
    }

    if (!result.data) {
      log(`⚠️ インサイトデータなし`, "WARNING")
      return null
    }

    // Parse metrics
    const metrics = {}
    result.data.forEach((item) => {
      metrics[item.name] = item.values[0]?.value || 0
    })

    log(`✅ インサイト取得成功`, "SUCCESS")
    log(`  再生数: ${metrics.plays || 0}`, "INFO")
    log(`  リーチ: ${metrics.reach || 0}`, "INFO")
    log(`  インプレッション: ${metrics.impressions || 0}`, "INFO")
    log(`  平均視聴時間: ${metrics.ig_reels_avg_watch_time || 0}秒`, "INFO")
    log(`  総視聴時間: ${metrics.ig_reels_video_view_total_time || 0}秒`, "INFO")
    log(`  エンゲージメント: ${metrics.engagement || 0}`, "INFO")
    log(`  保存数: ${metrics.saved || 0}`, "INFO")
    log(`  シェア数: ${metrics.shares || 0}`, "INFO")
    log(`  コメント数: ${metrics.comments || 0}`, "INFO")

    return metrics
  } catch (error) {
    log(`❌ エラー: ${error.message}`, "ERROR")
    return null
  }
}

/**
 * Get account insights
 * Metrics: impressions, reach, profile_views, website_clicks
 */
const getAccountInsights = async () => {
  try {
    logSection("【アカウント分析】")

    const insightsUrl = `${BASE_URL}/${IG_ACCOUNT_ID}/insights?metric=impressions,reach,profile_views,website_clicks&period=day&access_token=${FB_TOKEN}`

    log(`API URL: ${insightsUrl.substring(0, 80)}...`, "INFO")

    const response = await fetch(insightsUrl)
    const result = await response.json()

    if (result.error) {
      log(`❌ アカウントインサイト取得エラー: ${result.error.message}`, "ERROR")
      return null
    }

    if (!result.data) {
      log(`⚠️ アカウントデータなし`, "WARNING")
      return null
    }

    // Parse metrics
    const metrics = {}
    result.data.forEach((item) => {
      metrics[item.name] = item.values[0]?.value || 0
    })

    log(`✅ アカウントインサイト取得成功`, "SUCCESS")
    log(`  インプレッション: ${metrics.impressions || 0}`, "INFO")
    log(`  リーチ: ${metrics.reach || 0}`, "INFO")
    log(`  プロフィール表示: ${metrics.profile_views || 0}`, "INFO")
    log(`  ウェブサイトクリック: ${metrics.website_clicks || 0}`, "INFO")

    return metrics
  } catch (error) {
    log(`❌ エラー: ${error.message}`, "ERROR")
    return null
  }
}

/**
 * Get recent reels
 */
const getRecentReels = async (limit = 10) => {
  try {
    logSection("【最近のリール取得】")

    const reelsUrl = `${BASE_URL}/${IG_ACCOUNT_ID}/media?fields=id,caption,media_type,timestamp,like_count,comments_count,media_product_type&limit=${limit}&access_token=${FB_TOKEN}`

    log(`API URL: ${reelsUrl.substring(0, 80)}...`, "INFO")

    const response = await fetch(reelsUrl)
    const result = await response.json()

    if (result.error) {
      log(`❌ リール取得エラー: ${result.error.message}`, "ERROR")
      return []
    }

    if (!result.data) {
      log(`⚠️ リールデータなし`, "WARNING")
      return []
    }

    // Filter reels only
    const reels = result.data.filter((item) => item.media_product_type === "REELS")

    log(`✅ ${reels.length}件のリール取得成功`, "SUCCESS")

    reels.forEach((reel, index) => {
      log(`  [${index + 1}] ${reel.caption?.substring(0, 30)}... (${reel.like_count} likes)`, "INFO")
    })

    return reels
  } catch (error) {
    log(`❌ エラー: ${error.message}`, "ERROR")
    return []
  }
}

/**
 * Generate analytics report
 */
const generateReport = async () => {
  try {
    logSection("🎬 Instagram Reel Analytics Report")

    // Check environment variables
    log(`IG_ACCOUNT_ID: ${IG_ACCOUNT_ID || "❌ NOT SET"}`, "INFO")
    log(`FB_TOKEN: ${FB_TOKEN ? "✅ SET" : "❌ MISSING"}`, "INFO")

    if (!IG_ACCOUNT_ID || !FB_TOKEN) {
      throw new Error("Missing required environment variables")
    }

    // Get account insights
    const accountInsights = await getAccountInsights()

    // Get recent reels
    const recentReels = await getRecentReels(5)

    // Get insights for each reel
    logSection("【各リール詳細分析】")

    for (const reel of recentReels) {
      log(`\n📊 リール: ${reel.caption?.substring(0, 40)}...`, "INFO")
      const reelInsights = await getReelInsights(reel.id)

      if (reelInsights) {
        log(`  再生数: ${reelInsights.plays || 0}`, "SUCCESS")
        log(`  リーチ: ${reelInsights.reach || 0}`, "SUCCESS")
        log(`  平均視聴時間: ${reelInsights.ig_reels_avg_watch_time || 0}秒`, "SUCCESS")
      }

      // Rate limit: 1 request per second
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    logSection("✅ 分析レポート完了")
  } catch (error) {
    logSection("❌ エラーが発生しました")
    log(`Error: ${error.message}`, "ERROR")
    process.exit(1)
  }
}

// Main execution
generateReport()
