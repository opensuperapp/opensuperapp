// Copyright (c) 2025 WSO2 LLC. (https://www.wso2.com).
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
import { useState, useEffect } from "react";
import CalendarGrid from "./components/CalendarGrid";
import Legend from "./components/Legend";
import HolidaySummary from "./components/HolidaySummary";

// Holiday type constants
const HOLIDAY_TYPES = {
    FULL: "holiday_type_1", // Public, Bank, Mercantile
    BANK: "holiday_type_2", // Public, Bank
} as const;

export default function App() {
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [events, setEvents] = useState<HolidayEvent[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();

    useEffect(() => {
        import(`./../events/${year}.json`)
            .then((data) => setEvents(data.default as HolidayEvent[]))
            .catch(() => setEvents([]));
    }, [year]);

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const prevMonth = () => setCurrentDate(new Date(year, month - 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1));

    const getHolidayType = (date: Date): string | null => {
        const pad = (n: number) => n.toString().padStart(2, "0");
        const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
        const holiday = events.find((e) => dateStr >= e.start && dateStr < e.end);
        if (!holiday) return null;
        if (
            holiday.categories.includes("Public") &&
            holiday.categories.includes("Bank") &&
            holiday.categories.includes("Mercantile")
        )
            return HOLIDAY_TYPES.FULL;
        if (holiday.categories.includes("Public") && holiday.categories.includes("Bank")) return HOLIDAY_TYPES.BANK;
        return null;
    };

    const calendarDays: Array<Date | null> = [];
    for (let i = 0; i < firstDay; i++) calendarDays.push(null);
    for (let d = 1; d <= daysInMonth; d++) calendarDays.push(new Date(year, month, d));

    return (
        <div className=" items-center justify-center ">
            <div className=" px-1">
                <h2 className="text-center text-gray-500 mb-4">Sri Lankan Government Calendar 🇱🇰</h2>

                <div className="border rounded-lg p-4 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <span onClick={prevMonth} className="cursor-pointer text-4xl text-stone-900 hover:text-stone-600">◀</span>

                        <h3 className="font-semibold text-stone-950 text-lg">
                            {currentDate.toLocaleString("default", { month: "long", year: "numeric" })}
                        </h3>

                        <span onClick={nextMonth} className="cursor-pointer text-4xl text-stone-900 hover:text-stone-600">▶</span>
                    </div>

                    <CalendarGrid calendarDays={calendarDays} getHolidayType={getHolidayType} selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
                </div>

                <Legend />

                <HolidaySummary events={events} currentDate={currentDate} selectedDate={selectedDate} />

                <div className="flex mt-4 mb-4 justify-center ">
                    <button onClick={() => setCurrentDate(new Date())} className="text-xs text-gray-500 hover:text-gray-700 border p-2 rounded-lg">
                        Go to today
                    </button>
                </div>
            </div>
        </div>
    );
}
