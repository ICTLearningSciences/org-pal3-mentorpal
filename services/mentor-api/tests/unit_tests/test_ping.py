def test_it_returns_pong_response(client):
    res = client.get("/mentor-api/ping/")
    assert res.status_code == 200
    assert res.json.get("message") == "pong!"
    assert res.json.get("status") == "success"
