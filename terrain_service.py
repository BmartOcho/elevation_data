from fastapi import FastAPI
from fastapi.responses import Response
from rio_tiler.io import Reader
from rio_tiler.utils import render
import numpy as np
from math import radians, cos, sin, asin, sqrt

app = FastAPI()

# Point to your GeoTIFF directly (no COG needed yet)
TIFF_PATH = r"C:\data\elevation\geotiff\42_45.tif"
NODATA = -9999


def haversine_m(lat1, lon1, lat2, lon2):
    R = 6371000.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return 2 * R * asin(sqrt(a))


@app.get("/tiles/{z}/{x}/{y}.png")
def tile(z: int, x: int, y: int):
    with Reader(TIFF_PATH) as src:
        img = src.tile(x, y, z)
        png = render(img.data, mask=img.mask)
        return Response(png, media_type="image/png")


@app.get("/profile")
def profile(lat1: float, lon1: float, lat2: float, lon2: float, step_m: float = 60.0):
    total = haversine_m(lat1, lon1, lat2, lon2)
    n = max(2, int(total // step_m) + 1)

    lats = np.linspace(lat1, lat2, n)
    lons = np.linspace(lon1, lon2, n)

    elev = []
    with Reader(TIFF_PATH) as src:
        for lon, lat in zip(lons, lats):
            pt = src.point(float(lon), float(lat))  # <-- correct call
            e = float(pt.data[0])                   # band 1
            elev.append(None if e == NODATA else e)

    return {
        "total_m": total,
        "step_m": step_m,
        "points": [
            {"lat": float(lat), "lon": float(lon), "elev_m": ev}
            for lat, lon, ev in zip(lats, lons, elev)
        ],
    }
