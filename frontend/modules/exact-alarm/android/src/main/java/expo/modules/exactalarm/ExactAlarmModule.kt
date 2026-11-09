// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.
package expo.modules.exactalarm

import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExactAlarmModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExactAlarm")

    // Before Android 12 exact alarms need no permission.
    Function("canScheduleExactAlarms") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return@Function true
      val context = appContext.reactContext ?: return@Function true
      val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      alarmManager.canScheduleExactAlarms()
    }

    // Opens this app's own "Alarms & reminders" page. Without a package the
    // system shows the list of every app instead.
    Function("openExactAlarmSettings") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return@Function null
      val context = appContext.reactContext ?: return@Function null
      val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
        .setData(Uri.parse("package:${context.packageName}"))
      val activity = appContext.currentActivity
      if (activity != null) {
        activity.startActivity(intent)
      } else {
        context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      }
    }
  }
}
